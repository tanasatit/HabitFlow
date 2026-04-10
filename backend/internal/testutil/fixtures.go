package testutil

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/habitflow/api/internal/domain/habit"
	"github.com/habitflow/api/internal/domain/user"
)

// MakeUser creates and persists a user with the given email and plaintext password.
// If name is empty, email is used as name. Returns the created user.
func MakeUser(t *testing.T, db *gorm.DB, email, password string) *user.User {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("testutil.MakeUser: hash password: %v", err)
	}

	u := &user.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		Name:         email,
		Role:         user.RoleFree,
	}

	if err := db.Create(u).Error; err != nil {
		t.Fatalf("testutil.MakeUser: create user: %v", err)
	}

	return u
}

// MakeGoogleUser creates and persists a user that has only a Google ID set (no password hash).
// This simulates a Google-only account that cannot use local login.
func MakeGoogleUser(t *testing.T, db *gorm.DB, email, googleID string) *user.User {
	t.Helper()

	gid := googleID
	u := &user.User{
		ID:       uuid.New(),
		Email:    email,
		Name:     email,
		Role:     user.RoleFree,
		GoogleID: &gid,
		// PasswordHash intentionally left empty to mark as Google-only account.
	}

	if err := db.Create(u).Error; err != nil {
		t.Fatalf("testutil.MakeGoogleUser: create user: %v", err)
	}

	return u
}

// MakeHabit creates and persists a habit for the given user.
func MakeHabit(t *testing.T, db *gorm.DB, userID uuid.UUID, name string) *habit.Habit {
	t.Helper()

	h := &habit.Habit{
		ID:         uuid.New(),
		UserID:     userID,
		Name:       name,
		Category:   "health",
		Frequency:  "daily",
		TargetTime: "anytime",
		IsActive:   true,
		Points:     10,
	}

	if err := db.Create(h).Error; err != nil {
		t.Fatalf("testutil.MakeHabit: create habit: %v", err)
	}

	return h
}

// MakeHabitLog creates and persists a habit log entry for the given habit on the given day.
func MakeHabitLog(t *testing.T, db *gorm.DB, habitID, userID uuid.UUID, completedAt time.Time) *habit.HabitLog {
	t.Helper()

	l := &habit.HabitLog{
		ID:          uuid.New(),
		HabitID:     habitID,
		UserID:      userID,
		CompletedAt: completedAt,
	}

	if err := db.Create(l).Error; err != nil {
		t.Fatalf("testutil.MakeHabitLog: create log: %v", err)
	}

	return l
}
