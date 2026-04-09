package user

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/habitflow/api/pkg/config"
)

var (
	ErrEmailTaken        = errors.New("email already in use")
	ErrInvalidCreds      = errors.New("invalid email or password")
	ErrUserNotFound      = errors.New("user not found")
	ErrGoogleOnlyAccount = errors.New("this account uses Google sign-in, please use the Google button to log in")
)

// tokenClaims is used only for JWT generation — kept internal.
type tokenClaims struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

type RegisterInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name"     binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type Service struct {
	repo *Repository
	cfg  *config.Config
}

func NewService(repo *Repository, cfg *config.Config) *Service {
	return &Service{repo: repo, cfg: cfg}
}

func (s *Service) Register(input RegisterInput) (*User, string, error) {
	// Check email uniqueness
	_, err := s.repo.FindByEmail(input.Email)
	if err == nil {
		return nil, "", ErrEmailTaken
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}

	u := &User{
		ID:           uuid.New(),
		Email:        input.Email,
		PasswordHash: string(hash),
		Name:         input.Name,
		Role:         RoleFree,
	}

	if err := s.repo.Create(u); err != nil {
		return nil, "", err
	}

	token, err := s.GenerateTokenForUser(u)
	if err != nil {
		return nil, "", err
	}

	return u, token, nil
}

func (s *Service) Login(input LoginInput) (*User, string, error) {
	u, err := s.repo.FindByEmail(input.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", ErrInvalidCreds
		}
		return nil, "", err
	}

	// Block local login for Google-only accounts (no password set)
	if u.PasswordHash == "" {
		return nil, "", ErrGoogleOnlyAccount
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(input.Password)); err != nil {
		return nil, "", ErrInvalidCreds
	}

	token, err := s.GenerateTokenForUser(u)
	if err != nil {
		return nil, "", err
	}

	return u, token, nil
}

func (s *Service) GetByID(id uuid.UUID) (*User, error) {
	u, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return u, nil
}

// GenerateTokenForUser creates a signed JWT for the given user. Exported for use by googleauth package.
func (s *Service) GenerateTokenForUser(u *User) (string, error) {
	expiry := time.Duration(s.cfg.JWTExpiryHours) * time.Hour
	cl := tokenClaims{
		UserID: u.ID,
		Role:   string(u.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, cl)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
