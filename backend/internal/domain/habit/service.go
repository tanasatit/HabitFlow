package habit

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/habitflow/api/internal/domain/user"
)

const MAX_FREE_HABITS = 3

var (
	ErrFreeTierLimit = errors.New("free tier limited to 3 habits")
	ErrHabitNotFound = errors.New("habit not found")
	ErrNotOwner      = errors.New("you do not own this habit")
	ErrAlreadyLogged = errors.New("habit already logged today")
)

type Service struct {
	repo     *Repository
	userRepo *user.Repository
}

func NewService(repo *Repository, userRepo *user.Repository) *Service {
	return &Service{repo: repo, userRepo: userRepo}
}

func (s *Service) Create(userID uuid.UUID, input CreateInput) (*Habit, error) {
	u, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	if u.Role == user.RoleFree {
		count, err := s.repo.CountActiveByUserID(userID)
		if err != nil {
			return nil, err
		}
		if count >= MAX_FREE_HABITS {
			return nil, ErrFreeTierLimit
		}
	}

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
		streak := s.calculateStreak(h.ID)
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

	streak := s.calculateStreak(habitID)
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

// calculateStreak counts consecutive days with a log, starting from today or yesterday.
func (s *Service) calculateStreak(habitID uuid.UUID) int {
	logs, err := s.repo.FindLogsByHabitIDAll(habitID)
	if err != nil || len(logs) == 0 {
		return 0
	}

	// Build a set of dates (UTC day-truncated) that have logs
	logDates := make(map[string]bool)
	for _, l := range logs {
		day := l.CompletedAt.UTC().Truncate(24 * time.Hour)
		logDates[day.Format("2006-01-02")] = true
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)

	// If today has a log, start counting from today; otherwise start from yesterday
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
