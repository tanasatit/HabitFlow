package testutil

import (
	"strings"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/habitflow/api/internal/domain/habit"
	"github.com/habitflow/api/internal/domain/user"
)

// NewTestDB opens an in-memory SQLite database and auto-migrates the models
// required by the test suite (user, habit, habit_log, subscription).
//
// NOTE: Models with Postgres-specific DDL that cannot run on SQLite (e.g.
// AIConversation with jsonb, GoogleToken) are intentionally excluded here.
// Tests for those packages can spin up their own DB helpers as needed.
//
// The database is isolated per test — each call opens a private in-memory
// instance keyed by the test name so parallel sub-tests do not interfere.
func NewTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	// Use a per-test named in-memory database so sub-tests don't share state.
	// URL-encode the test name to strip characters that upset SQLite's URI parser.
	safeName := strings.NewReplacer(
		"/", "_",
		" ", "_",
		"(", "_",
		")", "_",
	).Replace(t.Name())

	dsn := "file:" + safeName + "?mode=memory&cache=private&_fk=1"

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("testutil.NewTestDB: open sqlite: %v", err)
	}

	if err := db.AutoMigrate(
		&user.User{},
		&user.Subscription{},
		&habit.Habit{},
		&habit.HabitLog{},
	); err != nil {
		t.Fatalf("testutil.NewTestDB: migrate: %v", err)
	}

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}
