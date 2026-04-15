package habit

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrHabitNotFound  = errors.New("habit not found")
	ErrNotOwner       = errors.New("you do not own this habit")
	ErrAlreadyLogged  = errors.New("habit already logged today")
	ErrNotLoggedToday = errors.New("habit not logged today")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(userID uuid.UUID, input CreateInput) (*Habit, error) {
	// Apply defaults for optional fields
	category := input.Category
	frequency := input.Frequency
	if frequency == "" {
		frequency = "daily"
	}
	targetTime := input.TargetTime
	if targetTime == "" {
		targetTime = "anytime"
	}

	h := &Habit{
		ID:          uuid.New(),
		UserID:      userID,
		Name:        input.Name,
		Category:    category,
		Frequency:   frequency,
		TargetTime:  targetTime,
		Description: input.Description,
		IsActive:    true,
		Points:      10,
	}

	if err := s.repo.Create(h); err != nil {
		return nil, err
	}

	return h, nil
}

func (s *Service) List(userID uuid.UUID) ([]HabitWithStreak, error) {
	habits, err := s.repo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	todayLogs, err := s.repo.FindTodayLogsByUserID(userID)
	if err != nil {
		return nil, err
	}

	// Build set of habit IDs completed today
	completedToday := make(map[uuid.UUID]bool)
	for _, log := range todayLogs {
		completedToday[log.HabitID] = true
	}

	result := make([]HabitWithStreak, 0, len(habits))
	for _, h := range habits {
		streak := s.CalculateStreak(h.ID)
		result = append(result, HabitWithStreak{
			Habit:          h,
			CurrentStreak:  streak,
			CompletedToday: completedToday[h.ID],
		})
	}

	return result, nil
}

func (s *Service) GetByID(userID, habitID uuid.UUID) (*HabitWithStreak, error) {
	h, err := s.repo.FindByID(habitID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrHabitNotFound
		}
		return nil, err
	}

	if h.UserID != userID {
		return nil, ErrNotOwner
	}

	streak := s.CalculateStreak(habitID)
	today := time.Now()
	_, logErr := s.repo.FindLogByHabitAndDate(habitID, today)
	completedToday := logErr == nil

	return &HabitWithStreak{
		Habit:          *h,
		CurrentStreak:  streak,
		CompletedToday: completedToday,
	}, nil
}

func (s *Service) Update(userID, habitID uuid.UUID, input UpdateInput) (*Habit, error) {
	h, err := s.repo.FindByID(habitID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrHabitNotFound
		}
		return nil, err
	}

	if h.UserID != userID {
		return nil, ErrNotOwner
	}

	// Apply non-nil fields only
	if input.Name != nil {
		h.Name = *input.Name
	}
	if input.Category != nil {
		h.Category = *input.Category
	}
	if input.Frequency != nil {
		h.Frequency = *input.Frequency
	}
	if input.TargetTime != nil {
		h.TargetTime = *input.TargetTime
	}
	if input.Description != nil {
		h.Description = *input.Description
	}
	if input.IsActive != nil {
		h.IsActive = *input.IsActive
	}

	if err := s.repo.Update(h); err != nil {
		return nil, err
	}

	return h, nil
}

func (s *Service) Delete(userID, habitID uuid.UUID) error {
	h, err := s.repo.FindByID(habitID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrHabitNotFound
		}
		return err
	}

	if h.UserID != userID {
		return ErrNotOwner
	}

	return s.repo.Delete(habitID)
}

func (s *Service) LogCompletion(userID, habitID uuid.UUID, input LogInput) (*HabitLog, error) {
	h, err := s.repo.FindByID(habitID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrHabitNotFound
		}
		return nil, err
	}

	if h.UserID != userID {
		return nil, ErrNotOwner
	}

	// Check if already logged today
	_, logErr := s.repo.FindLogByHabitAndDate(habitID, time.Now())
	if logErr == nil {
		return nil, ErrAlreadyLogged
	}
	if !errors.Is(logErr, gorm.ErrRecordNotFound) {
		return nil, logErr
	}

	log := &HabitLog{
		ID:          uuid.New(),
		HabitID:     habitID,
		UserID:      userID,
		CompletedAt: time.Now(),
		Notes:       input.Notes,
	}

	if err := s.repo.CreateLog(log); err != nil {
		return nil, err
	}

	return log, nil
}

// UndoCompletion deletes today's log entry for a habit, effectively unchecking it.
func (s *Service) UndoCompletion(userID, habitID uuid.UUID) error {
	h, err := s.repo.FindByID(habitID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrHabitNotFound
		}
		return err
	}
	if h.UserID != userID {
		return ErrNotOwner
	}
	_, logErr := s.repo.FindLogByHabitAndDate(habitID, time.Now())
	if errors.Is(logErr, gorm.ErrRecordNotFound) {
		return ErrNotLoggedToday
	}
	if logErr != nil {
		return logErr
	}
	return s.repo.DeleteTodayLog(habitID)
}

// GetHabitStats returns detailed statistics for a single habit.
// Validates ownership. Used by GET /habits/:id/stats.
func (s *Service) GetHabitStats(userID, habitID uuid.UUID) (*HabitStats, error) {
	h, err := s.repo.FindByID(habitID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrHabitNotFound
		}
		return nil, err
	}

	if h.UserID != userID {
		return nil, ErrNotOwner
	}

	// Fetch all-time logs once — reused for streak, longest streak, and total count.
	allLogs, err := s.repo.FindLogsByHabitIDAll(habitID)
	if err != nil {
		return nil, err
	}

	// Current streak: computed from pre-fetched logs (no extra DB query).
	currentStreak := CalculateStreakFromLogs(allLogs)

	// Longest streak: scan all log dates.
	longestStreak := s.calculateLongestStreak(allLogs)

	// Total completed = unique days (deduplicated, consistent with CompletionRate).
	uniqueDays := make(map[string]bool, len(allLogs))
	for _, l := range allLogs {
		uniqueDays[l.CompletedAt.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = true
	}
	totalCompleted := len(uniqueDays)

	// Completion rate: last 30 days
	thirtyDaysAgo := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -29)
	last30Logs, err := s.repo.FindLogsByHabitIDSince(habitID, thirtyDaysAgo)
	if err != nil {
		return nil, err
	}
	logDates30 := make(map[string]bool)
	for _, l := range last30Logs {
		logDates30[l.CompletedAt.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = true
	}
	completionRate := float64(len(logDates30)) / 30.0

	// Weekly data: last 7 days
	sevenDaysAgo := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -6)
	last7Logs, err := s.repo.FindLogsByHabitIDSince(habitID, sevenDaysAgo)
	if err != nil {
		return nil, err
	}
	logDates7 := make(map[string]bool)
	for _, l := range last7Logs {
		logDates7[l.CompletedAt.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = true
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	weeklyData := make([]DayCount, 7)
	for i := 0; i < 7; i++ {
		day := sevenDaysAgo.AddDate(0, 0, i)
		key := day.Format("2006-01-02")
		weeklyData[i] = DayCount{
			Date:      key,
			Completed: logDates7[key],
		}
	}

	completedToday := logDates7[today.Format("2006-01-02")]

	return &HabitStats{
		HabitID:        h.ID,
		Name:           h.Name,
		Category:       h.Category,
		CurrentStreak:  currentStreak,
		LongestStreak:  longestStreak,
		TotalCompleted: totalCompleted,
		CompletionRate: completionRate,
		WeeklyData:     weeklyData,
		CompletedToday: completedToday,
	}, nil
}

// calculateLongestStreak scans a sorted (desc) slice of logs and returns the longest consecutive streak.
func (s *Service) calculateLongestStreak(logs []HabitLog) int {
	if len(logs) == 0 {
		return 0
	}

	// Build set of unique dates
	dateSet := make(map[string]bool)
	for _, l := range logs {
		dateSet[l.CompletedAt.UTC().Truncate(24*time.Hour).Format("2006-01-02")] = true
	}

	// Collect sorted dates (ascending)
	dates := make([]time.Time, 0, len(dateSet))
	for key := range dateSet {
		t, err := time.Parse("2006-01-02", key)
		if err == nil {
			dates = append(dates, t)
		}
	}

	// Sort ascending
	for i := 0; i < len(dates)-1; i++ {
		for j := i + 1; j < len(dates); j++ {
			if dates[j].Before(dates[i]) {
				dates[i], dates[j] = dates[j], dates[i]
			}
		}
	}

	longest := 1
	current := 1
	for i := 1; i < len(dates); i++ {
		diff := dates[i].Sub(dates[i-1])
		if diff == 24*time.Hour {
			current++
			if current > longest {
				longest = current
			}
		} else {
			current = 1
		}
	}

	return longest
}

// CalculateStreakFromLogs computes the current streak from a pre-fetched slice of logs.
// Exported so callers with pre-fetched data avoid redundant DB queries.
func CalculateStreakFromLogs(logs []HabitLog) int {
	if len(logs) == 0 {
		return 0
	}

	logDates := make(map[string]bool)
	for _, l := range logs {
		day := l.CompletedAt.UTC().Truncate(24 * time.Hour)
		logDates[day.Format("2006-01-02")] = true
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)

	var start time.Time
	todayKey := today.Format("2006-01-02")
	if logDates[todayKey] {
		start = today
	} else {
		start = today.Add(-24 * time.Hour)
		yesterdayKey := start.Format("2006-01-02")
		if !logDates[yesterdayKey] {
			return 0
		}
	}

	streak := 0
	current := start
	for {
		key := current.Format("2006-01-02")
		if !logDates[key] {
			break
		}
		streak++
		current = current.Add(-24 * time.Hour)
	}

	return streak
}

// CalculateStreak fetches all logs for a habit and computes the current streak.
// Use CalculateStreakFromLogs when logs are already available to avoid an extra DB query.
func (s *Service) CalculateStreak(habitID uuid.UUID) int {
	logs, err := s.repo.FindLogsByHabitIDAll(habitID)
	if err != nil {
		return 0
	}
	return CalculateStreakFromLogs(logs)
}

