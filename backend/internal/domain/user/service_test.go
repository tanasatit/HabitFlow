package user_test

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"github.com/habitflow/api/internal/domain/user"
	"github.com/habitflow/api/internal/testutil"
	"github.com/habitflow/api/pkg/config"
)

const (
	testJWTSecret      = "test-secret"
	testJWTExpiryHours = 24
)

// testConfig returns a minimal Config suitable for unit tests.
func testConfig() *config.Config {
	return &config.Config{
		JWTSecret:      testJWTSecret,
		JWTExpiryHours: testJWTExpiryHours,
	}
}

func newUserSvc(t *testing.T) *user.Service {
	t.Helper()
	db := testutil.NewTestDB(t)
	repo := user.NewRepository(db)
	return user.NewService(repo, testConfig())
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

func TestService_Register_HappyPath(t *testing.T) {
	svc := newUserSvc(t)

	u, token, err := svc.Register(user.RegisterInput{
		Email:    "alice@example.com",
		Password: "password123",
		Name:     "Alice",
	})

	require.NoError(t, err)
	require.NotNil(t, u)
	require.NotEmpty(t, token)

	// Password must be stored as bcrypt hash, not plaintext.
	require.NotEqual(t, "password123", u.PasswordHash)
	err = bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte("password123"))
	require.NoError(t, err, "stored hash must match original password")

	require.Equal(t, "alice@example.com", u.Email)
	require.Equal(t, "Alice", u.Name)
	require.Equal(t, user.RoleFree, u.Role)
}

func TestService_Register_DuplicateEmail(t *testing.T) {
	svc := newUserSvc(t)

	_, _, err := svc.Register(user.RegisterInput{
		Email:    "bob@example.com",
		Password: "password123",
		Name:     "Bob",
	})
	require.NoError(t, err)

	// Second registration with same email must fail.
	_, _, err = svc.Register(user.RegisterInput{
		Email:    "bob@example.com",
		Password: "hunter2",
		Name:     "Bob2",
	})
	require.ErrorIs(t, err, user.ErrEmailTaken)
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

func TestService_Login_HappyPath(t *testing.T) {
	svc := newUserSvc(t)

	_, _, err := svc.Register(user.RegisterInput{
		Email:    "carol@example.com",
		Password: "securepass",
		Name:     "Carol",
	})
	require.NoError(t, err)

	u, token, err := svc.Login(user.LoginInput{
		Email:    "carol@example.com",
		Password: "securepass",
	})

	require.NoError(t, err)
	require.NotNil(t, u)
	require.NotEmpty(t, token)
	require.Equal(t, "carol@example.com", u.Email)
}

func TestService_Login_WrongPassword(t *testing.T) {
	svc := newUserSvc(t)

	_, _, err := svc.Register(user.RegisterInput{
		Email:    "dave@example.com",
		Password: "correctpassword",
		Name:     "Dave",
	})
	require.NoError(t, err)

	_, _, err = svc.Login(user.LoginInput{
		Email:    "dave@example.com",
		Password: "wrongpassword",
	})
	require.ErrorIs(t, err, user.ErrInvalidCreds)
}

func TestService_Login_UserNotFound(t *testing.T) {
	svc := newUserSvc(t)

	_, _, err := svc.Login(user.LoginInput{
		Email:    "nobody@example.com",
		Password: "doesnotmatter",
	})
	require.ErrorIs(t, err, user.ErrInvalidCreds)
}

func TestService_Login_GoogleOnlyAccount(t *testing.T) {
	db := testutil.NewTestDB(t)
	repo := user.NewRepository(db)
	svc := user.NewService(repo, testConfig())

	// Create a Google-only account via fixture.
	testutil.MakeGoogleUser(t, db, "google@example.com", "google-sub-123")

	_, _, err := svc.Login(user.LoginInput{
		Email:    "google@example.com",
		Password: "anypassword",
	})
	require.ErrorIs(t, err, user.ErrGoogleOnlyAccount)
}

// ---------------------------------------------------------------------------
// JWT issuance: claims and expiry
// ---------------------------------------------------------------------------

func TestService_Register_JWTClaims(t *testing.T) {
	svc := newUserSvc(t)

	u, token, err := svc.Register(user.RegisterInput{
		Email:    "eve@example.com",
		Password: "password123",
		Name:     "Eve",
	})
	require.NoError(t, err)

	// Parse the token manually to inspect claims.
	parsed, err := jwt.Parse(token, func(tok *jwt.Token) (interface{}, error) {
		require.IsType(t, &jwt.SigningMethodHMAC{}, tok.Method)
		return []byte(testJWTSecret), nil
	})
	require.NoError(t, err)
	require.True(t, parsed.Valid)

	claims, ok := parsed.Claims.(jwt.MapClaims)
	require.True(t, ok)

	// user_id claim must match the registered user's ID.
	userIDClaim, ok := claims["user_id"]
	require.True(t, ok, "user_id claim must be present")
	require.Equal(t, u.ID.String(), userIDClaim)

	// exp must be roughly 24 hours from now (allow 10s tolerance).
	expRaw, ok := claims["exp"]
	require.True(t, ok)
	expFloat, ok := expRaw.(float64)
	require.True(t, ok)
	expTime := time.Unix(int64(expFloat), 0)
	expectedExpiry := time.Now().Add(time.Duration(testJWTExpiryHours) * time.Hour)
	diff := expTime.Sub(expectedExpiry)
	if diff < 0 {
		diff = -diff
	}
	require.Less(t, diff, 10*time.Second, "token expiry should be within 10s of configured TTL")
}

func TestService_GenerateTokenForUser_IsValid(t *testing.T) {
	db := testutil.NewTestDB(t)
	repo := user.NewRepository(db)
	svc := user.NewService(repo, testConfig())

	u := testutil.MakeUser(t, db, "frank@example.com", "pass1234")

	token, err := svc.GenerateTokenForUser(u)
	require.NoError(t, err)
	require.NotEmpty(t, token)

	parsed, err := jwt.Parse(token, func(tok *jwt.Token) (interface{}, error) {
		return []byte(testJWTSecret), nil
	})
	require.NoError(t, err)
	require.True(t, parsed.Valid)
}

// ---------------------------------------------------------------------------
// GetByID
// ---------------------------------------------------------------------------

func TestService_GetByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	repo := user.NewRepository(db)
	svc := user.NewService(repo, testConfig())

	u := testutil.MakeUser(t, db, "grace@example.com", "pass1234")

	found, err := svc.GetByID(u.ID)
	require.NoError(t, err)
	require.Equal(t, u.ID, found.ID)
	require.Equal(t, u.Email, found.Email)
}

func TestService_GetByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	repo := user.NewRepository(db)
	svc := user.NewService(repo, testConfig())

	nonExistentID := [16]byte{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1}
	_, err := svc.GetByID(nonExistentID)
	require.ErrorIs(t, err, user.ErrUserNotFound)
}
