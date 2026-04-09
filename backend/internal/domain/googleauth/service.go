package googleauth

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"

	"github.com/habitflow/api/internal/domain/user"
	"github.com/habitflow/api/pkg/config"
)

// GoogleUserInfo represents the profile returned by Google's userinfo endpoint.
type GoogleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type stateEntry struct {
	Expiry time.Time
}

type Service struct {
	userRepo    *user.Repository
	userSvc     *user.Service
	oauthCfg    *oauth2.Config
	frontendURL string
	stateStore  sync.Map
	stopCleanup chan struct{}
}

func NewService(userRepo *user.Repository, userSvc *user.Service, cfg *config.Config) *Service {
	if cfg.GoogleIdentityClientID == "" {
		log.Println("WARNING: GOOGLE_IDENTITY_CLIENT_ID is unset — Google Sign-In will fail at runtime")
	}

	oauthCfg := &oauth2.Config{
		ClientID:     cfg.GoogleIdentityClientID,
		ClientSecret: cfg.GoogleIdentityClientSecret,
		RedirectURL:  cfg.GoogleIdentityRedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}

	svc := &Service{
		userRepo:    userRepo,
		userSvc:     userSvc,
		oauthCfg:    oauthCfg,
		frontendURL: cfg.FrontendURL,
		stopCleanup: make(chan struct{}),
	}
	go svc.cleanupStateStore()
	return svc
}

// Stop signals the cleanup goroutine to exit. Call during server shutdown.
func (s *Service) Stop() {
	close(s.stopCleanup)
}

// cleanupStateStore periodically prunes expired state entries to prevent memory leaks.
func (s *Service) cleanupStateStore() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			now := time.Now()
			s.stateStore.Range(func(key, val any) bool {
				if entry, ok := val.(stateEntry); ok && now.After(entry.Expiry) {
					s.stateStore.Delete(key)
				}
				return true
			})
		case <-s.stopCleanup:
			return
		}
	}
}

// GenerateState creates a random 16-byte hex state token and stores it with a 10-minute TTL.
func (s *Service) GenerateState() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	state := fmt.Sprintf("%x", b)
	s.stateStore.Store(state, stateEntry{
		Expiry: time.Now().Add(10 * time.Minute),
	})
	return state
}

// ValidateState validates a state token and consumes it (load-and-delete).
func (s *Service) ValidateState(state string) bool {
	val, ok := s.stateStore.LoadAndDelete(state)
	if !ok {
		return false
	}
	entry, _ := val.(stateEntry)
	return !time.Now().After(entry.Expiry)
}

// GetAuthURL returns the Google OAuth2 consent URL with the given state token.
func (s *Service) GetAuthURL(state string) string {
	return s.oauthCfg.AuthCodeURL(state,
		oauth2.SetAuthURLParam("prompt", "select_account"),
	)
}

// ExchangeCode exchanges an authorization code for an OAuth2 token.
func (s *Service) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	token, err := s.oauthCfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("googleauth.Service.ExchangeCode: %w", err)
	}
	return token, nil
}

// FetchUserInfo retrieves the Google user profile using the given OAuth2 token.
func (s *Service) FetchUserInfo(ctx context.Context, token *oauth2.Token) (*GoogleUserInfo, error) {
	client := s.oauthCfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("googleauth.Service.FetchUserInfo: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("googleauth.Service.FetchUserInfo: unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var info GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("googleauth.Service.FetchUserInfo: decode failed: %w", err)
	}
	return &info, nil
}

// UpsertUser finds or creates a HabitFlow user based on Google identity info.
// Logic:
//  1. Look up by google_id — if found, update name/avatar and return
//  2. Look up by email — if found, link google_id + avatar and return
//  3. Create new free-tier user with no password
func (s *Service) UpsertUser(ctx context.Context, info *GoogleUserInfo) (*user.User, error) {
	// Step 1: look up by google_id
	existing, err := s.userRepo.FindByGoogleID(info.ID)
	if err == nil && existing != nil {
		// Update name and avatar_url
		if err := s.userRepo.UpdateNameAndAvatar(existing.ID, info.Name, info.Picture); err != nil {
			return nil, fmt.Errorf("googleauth.Service.UpsertUser: update name/avatar: %w", err)
		}
		existing.Name = info.Name
		avatarURL := info.Picture
		existing.AvatarURL = &avatarURL
		return existing, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("googleauth.Service.UpsertUser: find by google_id: %w", err)
	}

	// Step 2: look up by email
	byEmail, err := s.userRepo.FindByEmail(info.Email)
	if err == nil && byEmail != nil {
		// Link google_id and avatar_url to the existing account
		if err := s.userRepo.UpdateGoogleID(byEmail.ID, info.ID, info.Picture); err != nil {
			return nil, fmt.Errorf("googleauth.Service.UpsertUser: link google_id: %w", err)
		}
		googleID := info.ID
		avatarURL := info.Picture
		byEmail.GoogleID = &googleID
		byEmail.AvatarURL = &avatarURL
		return byEmail, nil
	}
	// If the email lookup returned an error that is NOT record-not-found, propagate it
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("googleauth.Service.UpsertUser: find by email: %w", err)
	}

	// Step 3: create new user
	googleID := info.ID
	avatarURL := info.Picture
	newUser := &user.User{
		ID:           uuid.New(),
		Email:        info.Email,
		Name:         info.Name,
		Role:         user.RoleFree,
		PasswordHash: "",
		GoogleID:     &googleID,
		AvatarURL:    &avatarURL,
	}
	if err := s.userRepo.Create(newUser); err != nil {
		return nil, fmt.Errorf("googleauth.Service.UpsertUser: create user: %w", err)
	}
	return newUser, nil
}

// GenerateTokenForUser is a passthrough to user.Service.GenerateTokenForUser.
func (s *Service) GenerateTokenForUser(u *user.User) (string, error) {
	return s.userSvc.GenerateTokenForUser(u)
}

// GetFrontendURL returns the configured frontend base URL.
func (s *Service) GetFrontendURL() string {
	return s.frontendURL
}
