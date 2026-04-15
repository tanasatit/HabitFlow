package habit_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/habitflow/api/internal/domain/habit"
	"github.com/habitflow/api/internal/testutil"
)

// date is a helper that builds a UTC midnight time for the given year/month/day.
func date(year, month, day int) time.Time {
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

// ---------------------------------------------------------------------------
// CalculateStreakFromLogs — pure function, no DB needed
// ---------------------------------------------------------------------------

func TestCalculateStreakFromLogs(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour)
	twoDaysAgo := today.Add(-48 * time.Hour)
	threeDaysAgo := today.Add(-72 * time.Hour)

	tests := []struct {
		name       string
		logs       []habit.HabitLog
		wantStreak int
	}{
		{
			name:       "no logs",
			logs:       nil,
			wantStreak: 0,
		},
		{
			name:       "logged today only",
			logs:       []habit.HabitLog{{CompletedAt: today}},
			wantStreak: 1,
		},
		{
			name: "3-day streak ending today",
			logs: []habit.HabitLog{
				{CompletedAt: today},
				{CompletedAt: yesterday},
				{CompletedAt: twoDaysAgo},
			},
			wantStreak: 3,
		},
		{
			name: "streak broken by 1-day gap",
			logs: []habit.HabitLog{
				{CompletedAt: today},
				{CompletedAt: twoDaysAgo}, // gap: yesterday missing
			},
			wantStreak: 1,
		},
		{
			name: "streak excluding today continues from yesterday",
			logs: []habit.HabitLog{
				{CompletedAt: yesterday},
				{CompletedAt: twoDaysAgo},
			},
			wantStreak: 2,
		},
		{
			name: "4-day streak with duplicate same-day entry (deduped)",
			logs: []habit.HabitLog{
				{CompletedAt: today},
				{CompletedAt: today.Add(time.Hour)}, // same day as today
				{CompletedAt: yesterday},
				{CompletedAt: twoDaysAgo},
				{CompletedAt: threeDaysAgo},
			},
			wantStreak: 4,
		},
		{
			name: "yesterday and older but no today",
			logs: []habit.HabitLog{
				{CompletedAt: yesterday},
				{CompletedAt: twoDaysAgo},
				{CompletedAt: threeDaysAgo},
			},
			wantStreak: 3,
		},
		{
			name: "gap two days ago breaks streak",
			logs: []habit.HabitLog{
				{CompletedAt: yesterday},
				{CompletedAt: threeDaysAgo}, // twoDaysAgo missing
			},
			wantStreak: 1,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := habit.CalculateStreakFromLogs(tc.logs)
			require.Equal(t, tc.wantStreak, got)
		})
	}
}

// ---------------------------------------------------------------------------
// Service.CalculateStreak — uses DB via repository
// ---------------------------------------------------------------------------

func TestService_CalculateStreak(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour)
	twoDaysAgo := today.Add(-48 * time.Hour)

	tests := []struct {
		name       string
		logDates   []time.Time
		wantStreak int
	}{
		{"no logs", nil, 0},
		{"today only", []time.Time{today}, 1},
		{"3-day streak", []time.Time{today, yesterday, twoDaysAgo}, 3},
		{"broken streak", []time.Time{today, twoDaysAgo}, 1},
		{"streak from yesterday", []time.Time{yesterday, twoDaysAgo}, 2},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			db := testutil.NewTestDB(t)
			userID := uuid.New()
			h := testutil.MakeHabit(t, db, userID, "Test Habit")

			for _, d := range tc.logDates {
				testutil.MakeHabitLog(t, db, h.ID, userID, d)
			}

			svc := habit.NewService(habit.NewRepository(db))
			got := svc.CalculateStreak(h.ID)
			require.Equal(t, tc.wantStreak, got)
		})
	}
}

// ---------------------------------------------------------------------------
// Service.Create
// ---------------------------------------------------------------------------

func TestService_Create(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Morning Run"})
	require.NoError(t, err)
	require.NotEqual(t, uuid.UUID{}, h.ID)
	require.Equal(t, "Morning Run", h.Name)
	require.Equal(t, userID, h.UserID)
	require.Equal(t, "daily", h.Frequency)
	require.Equal(t, "anytime", h.TargetTime)
	require.True(t, h.IsActive)
}

// ---------------------------------------------------------------------------
// Service.LogCompletion — duplicate log same day returns ErrAlreadyLogged
// ---------------------------------------------------------------------------

func TestService_LogCompletion_DuplicateToday(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Read"})
	require.NoError(t, err)

	// First log should succeed.
	_, err = svc.LogCompletion(userID, h.ID, habit.LogInput{})
	require.NoError(t, err)

	// Second log same day should fail.
	_, err = svc.LogCompletion(userID, h.ID, habit.LogInput{})
	require.ErrorIs(t, err, habit.ErrAlreadyLogged)
}

// ---------------------------------------------------------------------------
// Service.LogCompletion — non-existent habit returns ErrHabitNotFound
// ---------------------------------------------------------------------------

func TestService_LogCompletion_HabitNotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	_, err := svc.LogCompletion(userID, uuid.New(), habit.LogInput{})
	require.ErrorIs(t, err, habit.ErrHabitNotFound)
}

// ---------------------------------------------------------------------------
// Service.LogCompletion — wrong user returns ErrNotOwner
// ---------------------------------------------------------------------------

func TestService_LogCompletion_NotOwner(t *testing.T) {
	db := testutil.NewTestDB(t)
	ownerID := uuid.New()
	otherID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(ownerID, habit.CreateInput{Name: "Yoga"})
	require.NoError(t, err)

	_, err = svc.LogCompletion(otherID, h.ID, habit.LogInput{})
	require.ErrorIs(t, err, habit.ErrNotOwner)
}

// ---------------------------------------------------------------------------
// Service.List — returns only the calling user's habits
// ---------------------------------------------------------------------------

func TestService_List_OwnershipIsolation(t *testing.T) {
	db := testutil.NewTestDB(t)
	user1 := uuid.New()
	user2 := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	_, err := svc.Create(user1, habit.CreateInput{Name: "Habit A"})
	require.NoError(t, err)
	_, err = svc.Create(user1, habit.CreateInput{Name: "Habit B"})
	require.NoError(t, err)
	_, err = svc.Create(user2, habit.CreateInput{Name: "Habit C"})
	require.NoError(t, err)

	list, err := svc.List(user1)
	require.NoError(t, err)
	require.Len(t, list, 2)

	list2, err := svc.List(user2)
	require.NoError(t, err)
	require.Len(t, list2, 1)
}

// ---------------------------------------------------------------------------
// Service.Update — applies partial updates
// ---------------------------------------------------------------------------

func TestService_Update(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Walk"})
	require.NoError(t, err)

	newName := "Run"
	updated, err := svc.Update(userID, h.ID, habit.UpdateInput{Name: &newName})
	require.NoError(t, err)
	require.Equal(t, "Run", updated.Name)
}

// ---------------------------------------------------------------------------
// Service.Delete — habit is gone after delete
// ---------------------------------------------------------------------------

func TestService_Delete(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Meditate"})
	require.NoError(t, err)

	err = svc.Delete(userID, h.ID)
	require.NoError(t, err)

	// Attempting to get after delete should return ErrHabitNotFound.
	_, err = svc.GetByID(userID, h.ID)
	require.ErrorIs(t, err, habit.ErrHabitNotFound)
}

// ---------------------------------------------------------------------------
// Service.GetByID — cross-user access returns ErrNotOwner (handler maps to 403)
// ---------------------------------------------------------------------------

func TestService_GetByID_NotOwner(t *testing.T) {
	db := testutil.NewTestDB(t)
	ownerID := uuid.New()
	otherID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(ownerID, habit.CreateInput{Name: "Swim"})
	require.NoError(t, err)

	_, err = svc.GetByID(otherID, h.ID)
	require.ErrorIs(t, err, habit.ErrNotOwner)
}

// ---------------------------------------------------------------------------
// Service.GetByID — happy path returns streak and completed_today
// ---------------------------------------------------------------------------

func TestService_GetByID_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Bike"})
	require.NoError(t, err)

	ws, err := svc.GetByID(userID, h.ID)
	require.NoError(t, err)
	require.Equal(t, h.ID, ws.ID)
	require.Equal(t, 0, ws.CurrentStreak)
	require.False(t, ws.CompletedToday)
}

// ---------------------------------------------------------------------------
// Service.GetHabitStats
// ---------------------------------------------------------------------------

func TestService_GetHabitStats_HappyPath(t *testing.T) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour)
	twoDaysAgo := today.Add(-48 * time.Hour)

	db := testutil.NewTestDB(t)
	userID := uuid.New()
	h := testutil.MakeHabit(t, db, userID, "Stats Habit")

	testutil.MakeHabitLog(t, db, h.ID, userID, today)
	testutil.MakeHabitLog(t, db, h.ID, userID, yesterday)
	testutil.MakeHabitLog(t, db, h.ID, userID, twoDaysAgo)

	svc := habit.NewService(habit.NewRepository(db))

	stats, err := svc.GetHabitStats(userID, h.ID)
	require.NoError(t, err)

	require.Equal(t, h.ID, stats.HabitID)
	require.Equal(t, 3, stats.CurrentStreak)
	require.Equal(t, 3, stats.LongestStreak)
	require.Equal(t, 3, stats.TotalCompleted)
	require.True(t, stats.CompletedToday)
	require.Len(t, stats.WeeklyData, 7)
}

func TestService_GetHabitStats_NotOwner(t *testing.T) {
	db := testutil.NewTestDB(t)
	ownerID := uuid.New()
	otherID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(ownerID, habit.CreateInput{Name: "Private"})
	require.NoError(t, err)

	_, err = svc.GetHabitStats(otherID, h.ID)
	require.ErrorIs(t, err, habit.ErrNotOwner)
}

func TestService_GetHabitStats_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	_, err := svc.GetHabitStats(userID, uuid.New())
	require.ErrorIs(t, err, habit.ErrHabitNotFound)
}

// ---------------------------------------------------------------------------
// Service.Update — not owner returns ErrNotOwner
// ---------------------------------------------------------------------------

func TestService_Update_NotOwner(t *testing.T) {
	db := testutil.NewTestDB(t)
	ownerID := uuid.New()
	otherID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(ownerID, habit.CreateInput{Name: "Draw"})
	require.NoError(t, err)

	newName := "Paint"
	_, err = svc.Update(otherID, h.ID, habit.UpdateInput{Name: &newName})
	require.ErrorIs(t, err, habit.ErrNotOwner)
}

func TestService_Update_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	newName := "Ghost"
	_, err := svc.Update(userID, uuid.New(), habit.UpdateInput{Name: &newName})
	require.ErrorIs(t, err, habit.ErrHabitNotFound)
}

// ---------------------------------------------------------------------------
// Service.Delete — not owner returns ErrNotOwner
// ---------------------------------------------------------------------------

func TestService_Delete_NotOwner(t *testing.T) {
	db := testutil.NewTestDB(t)
	ownerID := uuid.New()
	otherID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(ownerID, habit.CreateInput{Name: "Cook"})
	require.NoError(t, err)

	err = svc.Delete(otherID, h.ID)
	require.ErrorIs(t, err, habit.ErrNotOwner)
}

func TestService_Delete_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	err := svc.Delete(userID, uuid.New())
	require.ErrorIs(t, err, habit.ErrHabitNotFound)
}

// ---------------------------------------------------------------------------
// Service.UndoCompletion
// ---------------------------------------------------------------------------

func TestService_UndoCompletion_Success(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Undo Me"})
	require.NoError(t, err)

	_, err = svc.LogCompletion(userID, h.ID, habit.LogInput{})
	require.NoError(t, err)

	err = svc.UndoCompletion(userID, h.ID)
	require.NoError(t, err)

	// Should be possible to log again after undo.
	_, err = svc.LogCompletion(userID, h.ID, habit.LogInput{})
	require.NoError(t, err)
}

func TestService_UndoCompletion_NotLoggedToday(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Not Done"})
	require.NoError(t, err)

	err = svc.UndoCompletion(userID, h.ID)
	require.ErrorIs(t, err, habit.ErrNotLoggedToday)
}

func TestService_UndoCompletion_NotOwner(t *testing.T) {
	db := testutil.NewTestDB(t)
	ownerID := uuid.New()
	otherID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(ownerID, habit.CreateInput{Name: "Owned"})
	require.NoError(t, err)

	err = svc.UndoCompletion(otherID, h.ID)
	require.ErrorIs(t, err, habit.ErrNotOwner)
}

func TestService_UndoCompletion_HabitNotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	err := svc.UndoCompletion(userID, uuid.New())
	require.ErrorIs(t, err, habit.ErrHabitNotFound)
}

// ---------------------------------------------------------------------------
// Service.List — completedToday flag is set when today's log exists
// ---------------------------------------------------------------------------

func TestService_List_CompletedToday(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	svc := habit.NewService(habit.NewRepository(db))

	h, err := svc.Create(userID, habit.CreateInput{Name: "Done Today"})
	require.NoError(t, err)

	_, err = svc.LogCompletion(userID, h.ID, habit.LogInput{})
	require.NoError(t, err)

	list, err := svc.List(userID)
	require.NoError(t, err)
	require.Len(t, list, 1)
	require.True(t, list[0].CompletedToday)
	require.Equal(t, 1, list[0].CurrentStreak)
}

// ---------------------------------------------------------------------------
// Repository: FindLogsByHabitID, FindLogsByUserIDSince, FindLogsByHabitIDSince
// ---------------------------------------------------------------------------

func TestRepository_FindLogsByHabitID(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	h := testutil.MakeHabit(t, db, userID, "LogQuery Habit")
	repo := habit.NewRepository(db)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	testutil.MakeHabitLog(t, db, h.ID, userID, today)
	testutil.MakeHabitLog(t, db, h.ID, userID, today.Add(-48*time.Hour))

	// since yesterday: should only find today's log.
	logs, err := repo.FindLogsByHabitID(h.ID, today.Add(-24*time.Hour))
	require.NoError(t, err)
	require.Len(t, logs, 1)
}

func TestRepository_FindLogsByUserIDSince(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	h := testutil.MakeHabit(t, db, userID, "UserSince Habit")
	repo := habit.NewRepository(db)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	testutil.MakeHabitLog(t, db, h.ID, userID, today)
	testutil.MakeHabitLog(t, db, h.ID, userID, today.Add(-48*time.Hour))

	logs, err := repo.FindLogsByUserIDSince(userID, today.Add(-24*time.Hour))
	require.NoError(t, err)
	require.Len(t, logs, 1)
}

func TestRepository_FindLogsByHabitIDSince(t *testing.T) {
	db := testutil.NewTestDB(t)
	userID := uuid.New()
	h := testutil.MakeHabit(t, db, userID, "HabitSince Habit")
	repo := habit.NewRepository(db)

	today := time.Now().UTC().Truncate(24 * time.Hour)
	testutil.MakeHabitLog(t, db, h.ID, userID, today)
	testutil.MakeHabitLog(t, db, h.ID, userID, today.Add(-48*time.Hour))

	logs, err := repo.FindLogsByHabitIDSince(h.ID, today.Add(-24*time.Hour))
	require.NoError(t, err)
	require.Len(t, logs, 1)
}
