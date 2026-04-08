package googlecal

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	gcal "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
	"gorm.io/gorm"

	"github.com/habitflow/api/pkg/config"
)

// stateEntry stores both the expiry time and the userID for an OAuth state token.
type stateEntry struct {
	Expiry time.Time
	UserID uuid.UUID
}

type Service struct {
	repo        *Repository
	oauthCfg    *oauth2.Config
	frontendURL string
	stateStore  sync.Map // state -> stateEntry
}

func NewService(repo *Repository, cfg *config.Config) *Service {
	if cfg.GoogleClientID == "" {
		log.Println("WARNING: GOOGLE_CLIENT_ID is unset — Google Calendar OAuth will fail at runtime")
	}

	oauthCfg := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes:       []string{gcal.CalendarScope},
		Endpoint:     google.Endpoint,
	}
	svc := &Service{
		repo:        repo,
		oauthCfg:    oauthCfg,
		frontendURL: cfg.FrontendURL,
	}
	go svc.cleanupStateStore()
	return svc
}

// cleanupStateStore periodically prunes expired state entries to prevent memory leaks.
func (s *Service) cleanupStateStore() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		now := time.Now()
		s.stateStore.Range(func(key, val any) bool {
			if entry, ok := val.(stateEntry); ok && now.After(entry.Expiry) {
				s.stateStore.Delete(key)
			}
			return true
		})
	}
}

// GenerateState creates a random state token associated with the given userID.
func (s *Service) GenerateState(userID uuid.UUID) string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	state := fmt.Sprintf("%x", b)
	s.stateStore.Store(state, stateEntry{
		Expiry: time.Now().Add(10 * time.Minute),
		UserID: userID,
	})
	return state
}

// ValidateStateAndGetUser validates a state token and returns the associated userID.
// The state is consumed (deleted) on first use regardless of validity.
func (s *Service) ValidateStateAndGetUser(state string) (uuid.UUID, bool) {
	val, ok := s.stateStore.LoadAndDelete(state)
	if !ok {
		return uuid.Nil, false
	}
	entry, _ := val.(stateEntry)
	if time.Now().After(entry.Expiry) {
		return uuid.Nil, false
	}
	return entry.UserID, true
}

// ValidateState is kept for backward compatibility.
func (s *Service) ValidateState(state string) bool {
	_, ok := s.ValidateStateAndGetUser(state)
	return ok
}

// GetFrontendURL returns the configured frontend base URL.
func (s *Service) GetFrontendURL() string { return s.frontendURL }

func (s *Service) GetAuthURL(state string) string {
	return s.oauthCfg.AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	)
}

func (s *Service) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauthCfg.Exchange(ctx, code)
}

func (s *Service) SaveToken(ctx context.Context, userID uuid.UUID, token *oauth2.Token) error {
	// Get user's Google email from userinfo API
	email := ""
	client := s.oauthCfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err == nil {
		defer resp.Body.Close()
		var info struct {
			Email string `json:"email"`
		}
		if json.NewDecoder(resp.Body).Decode(&info) == nil {
			email = info.Email
		}
	}

	t := &GoogleToken{
		UserID:       userID,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		Expiry:       token.Expiry,
		Email:        email,
	}
	// Atomically restore soft-deleted record (if any) and upsert the new token.
	return s.repo.RestoreAndUpsert(t)
}

func (s *Service) IsConnected(userID uuid.UUID) bool {
	t, err := s.repo.FindByUserID(userID)
	return err == nil && t != nil
}

func (s *Service) GetStatus(userID uuid.UUID) (*ConnectionStatus, error) {
	t, err := s.repo.FindByUserID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &ConnectionStatus{Connected: false}, nil
		}
		return nil, err
	}
	return &ConnectionStatus{
		Connected:   true,
		Email:       t.Email,
		ConnectedAt: t.CreatedAt.UTC().Format(time.RFC3339),
	}, nil
}

func (s *Service) Disconnect(ctx context.Context, userID uuid.UUID) error {
	// Optionally revoke the token with Google
	t, err := s.repo.FindByUserID(userID)
	if err == nil && t != nil {
		token := &oauth2.Token{AccessToken: t.AccessToken}
		client := s.oauthCfg.Client(ctx, token)
		client.PostForm("https://oauth2.googleapis.com/revoke",
			url.Values{"token": {t.AccessToken}})
		// ignore revoke errors — still delete locally
	}
	return s.repo.Delete(userID)
}

// getValidToken returns a valid oauth2.Token, refreshing if expired.
func (s *Service) getValidToken(ctx context.Context, userID uuid.UUID) (*oauth2.Token, error) {
	t, err := s.repo.FindByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("google calendar not connected")
	}

	tok := &oauth2.Token{
		AccessToken:  t.AccessToken,
		RefreshToken: t.RefreshToken,
		TokenType:    t.TokenType,
		Expiry:       t.Expiry,
	}

	if tok.Valid() {
		return tok, nil
	}

	// Refresh
	ts := s.oauthCfg.TokenSource(ctx, tok)
	newTok, err := ts.Token()
	if err != nil {
		return nil, fmt.Errorf("token refresh failed: %w", err)
	}

	// Persist refreshed token
	t.AccessToken = newTok.AccessToken
	t.Expiry = newTok.Expiry
	if newTok.RefreshToken != "" {
		t.RefreshToken = newTok.RefreshToken
	}
	if err := s.repo.Upsert(t); err != nil {
		log.Printf("googlecal: failed to persist refreshed token for user %s: %v", userID, err)
	}

	return newTok, nil
}

func (s *Service) getCalendarService(ctx context.Context, userID uuid.UUID) (*gcal.Service, error) {
	tok, err := s.getValidToken(ctx, userID)
	if err != nil {
		return nil, err
	}
	httpClient := s.oauthCfg.Client(ctx, tok)
	return gcal.NewService(ctx, option.WithHTTPClient(httpClient))
}

func (s *Service) ReadEvents(ctx context.Context, userID uuid.UUID, startDate, endDate string) ([]GoogleCalendarEvent, error) {
	svc, err := s.getCalendarService(ctx, userID)
	if err != nil {
		return nil, err
	}

	timeMin := startDate + "T00:00:00Z"
	timeMax := endDate + "T23:59:59Z"

	events, err := svc.Events.List("primary").
		TimeMin(timeMin).
		TimeMax(timeMax).
		SingleEvents(true).
		OrderBy("startTime").
		Do()
	if err != nil {
		return nil, fmt.Errorf("google calendar read: %w", err)
	}

	result := make([]GoogleCalendarEvent, 0, len(events.Items))
	for _, item := range events.Items {
		if item.Start == nil {
			continue
		}
		startTime := ""
		scheduledDate := ""
		endTime := ""
		if item.Start.DateTime != "" {
			t, err := time.Parse(time.RFC3339, item.Start.DateTime)
			if err == nil {
				scheduledDate = t.Format("2006-01-02")
				startTime = t.Format("15:04")
			}
		} else {
			scheduledDate = item.Start.Date
		}
		if item.End != nil && item.End.DateTime != "" {
			t, err := time.Parse(time.RFC3339, item.End.DateTime)
			if err == nil {
				endTime = t.Format("15:04")
			}
		}
		durationMinutes := 0
		if startTime != "" && endTime != "" {
			st, _ := time.Parse("15:04", startTime)
			et, _ := time.Parse("15:04", endTime)
			durationMinutes = int(et.Sub(st).Minutes())
		}
		result = append(result, GoogleCalendarEvent{
			GoogleEventID:   item.Id,
			Title:           item.Summary,
			Description:     item.Description,
			ScheduledDate:   scheduledDate,
			StartTime:       startTime,
			EndTime:         endTime,
			DurationMinutes: durationMinutes,
			Source:          "google",
		})
	}
	return result, nil
}

func (s *Service) UpdateEvent(ctx context.Context, userID uuid.UUID, googleEventID, title, description, scheduledDate, startTime string, durationMinutes int) error {
	svc, err := s.getCalendarService(ctx, userID)
	if err != nil {
		return err
	}
	existing, err := svc.Events.Get("primary", googleEventID).Do()
	if err != nil {
		return fmt.Errorf("google calendar get event: %w", err)
	}
	if title != "" {
		existing.Summary = title
	}
	if description != "" {
		existing.Description = description
	}
	if scheduledDate != "" && startTime != "" {
		startDT := fmt.Sprintf("%sT%s:00", scheduledDate, startTime)
		t, parseErr := time.Parse("2006-01-02T15:04:05", startDT)
		if parseErr == nil {
			dur := durationMinutes
			if dur <= 0 {
				dur = 30
			}
			end := t.Add(time.Duration(dur) * time.Minute)
			existing.Start = &gcal.EventDateTime{DateTime: t.Format(time.RFC3339), TimeZone: "UTC"}
			existing.End = &gcal.EventDateTime{DateTime: end.Format(time.RFC3339), TimeZone: "UTC"}
		}
	}
	_, err = svc.Events.Update("primary", googleEventID, existing).Do()
	return err
}

func (s *Service) WriteEvents(ctx context.Context, userID uuid.UUID, inputs []CreateGoogleEventInput) ([]GoogleCalendarEvent, error) {
	svc, err := s.getCalendarService(ctx, userID)
	if err != nil {
		return nil, err
	}

	created := make([]GoogleCalendarEvent, 0, len(inputs))
	var errs []string
	for _, input := range inputs {
		startDT := fmt.Sprintf("%sT%s:00", input.ScheduledDate, input.StartTime)
		startTime, err := time.Parse("2006-01-02T15:04:05", startDT)
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: invalid time format: %v", input.Title, err))
			continue
		}
		endTime := startTime.Add(time.Duration(input.DurationMinutes) * time.Minute)

		event := &gcal.Event{
			Summary:     input.Title,
			Description: input.Description,
			Start: &gcal.EventDateTime{
				DateTime: startTime.Format(time.RFC3339),
				TimeZone: "UTC",
			},
			End: &gcal.EventDateTime{
				DateTime: endTime.Format(time.RFC3339),
				TimeZone: "UTC",
			},
		}
		createdEvent, err := svc.Events.Insert("primary", event).Do()
		if err != nil {
			errs = append(errs, fmt.Sprintf("%s: %v", input.Title, err))
			continue
		}

		created = append(created, GoogleCalendarEvent{
			GoogleEventID:   createdEvent.Id,
			Title:           input.Title,
			Description:     input.Description,
			ScheduledDate:   input.ScheduledDate,
			StartTime:       input.StartTime,
			EndTime:         endTime.Format("15:04"),
			DurationMinutes: input.DurationMinutes,
			Source:          "google",
		})
	}
	if len(created) == 0 && len(errs) > 0 {
		return nil, fmt.Errorf("all events failed: %s", strings.Join(errs, "; "))
	}
	return created, nil
}
