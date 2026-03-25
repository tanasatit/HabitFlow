package dashboard

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/habitflow/api/internal/domain/habit"
)

// Service aggregates data from the habit domain to build dashboard stats.
type Service struct {
	habitSvc  *habit.Service
	habitRepo *habit.Repository
}

// NewService creates a new dashboard Service.
func NewService(habitSvc *habit.Service, habitRepo *habit.Repository) *Service {
	return &Service{
		habitSvc:  habitSvc,
		habitRepo: habitRepo,
	}
}

// GetDashboard computes the full dashboard stats for a user.
// Uses 4 DB queries total — no N+1 per habit.
func (s *Service) GetDashboard(userID uuid.UUID) (*DashboardStats, error) {
	// 1. Fetch active habits (1 query).
	habits, err := s.habitRepo.FindByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("dashboard.GetDashboard: fetch habits: %w", err)
	}
	totalHabits := len(habits)

	// 2. Fetch today's logs (1 query) — for completed-today count.
	todayLogs, err := s.habitRepo.FindTodayLogsByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("dashboard.GetDashboard: fetch today logs: %w", err)
	}
	completedTodaySet := make(map[uuid.UUID]bool, len(todayLogs))
	for _, l := range todayLogs {
		completedTodaySet[l.HabitID] = true
	}

	// 3. Fetch ALL historical logs (1 query) — for streaks + total points.
	allLogs, err := s.habitRepo.FindLogsByUserIDSince(userID, time.Time{})
	if err != nil {
		return nil, fmt.Errorf("dashboard.GetDashboard: fetch all logs: %w", err)
	}
	// Group logs by habitID for in-memory streak calculation.
	logsByHabit := make(map[uuid.UUID][]habit.HabitLog, len(habits))
	for _, l := range allLogs {
		logsByHabit[l.HabitID] = append(logsByHabit[l.HabitID], l)
	}

	// Points lookup map.
	pointsMap := make(map[uuid.UUID]int, len(habits))
	for _, h := range habits {
		pointsMap[h.ID] = h.Points
	}

	// Compute per-habit stats in-memory — zero additional DB queries.
	completedToday := 0
	overallStreak := 0
	for _, h := range habits {
		if completedTodaySet[h.ID] {
			completedToday++
		}
		streak := habit.CalculateStreakFromLogs(logsByHabit[h.ID])
		if streak > overallStreak {
			overallStreak = streak
		}
	}

	var completionRate float64
	if totalHabits > 0 {
		completionRate = float64(completedToday) / float64(totalHabits)
	}

	// 4. Fetch last-7-days logs (1 query) — for weekly chart.
	sevenDaysAgo := time.Now().UTC().Truncate(24 * time.Hour).AddDate(0, 0, -6)
	weekLogs, err := s.habitRepo.FindLogsByUserIDSince(userID, sevenDaysAgo)
	if err != nil {
		return nil, fmt.Errorf("dashboard.GetDashboard: fetch week logs: %w", err)
	}
	dateCompletions := make(map[string]map[uuid.UUID]bool)
	for _, l := range weekLogs {
		key := l.CompletedAt.UTC().Truncate(24 * time.Hour).Format("2006-01-02")
		if dateCompletions[key] == nil {
			dateCompletions[key] = make(map[uuid.UUID]bool)
		}
		dateCompletions[key][l.HabitID] = true
	}

	weeklySummary := make([]WeekDaySummary, 7)
	weeklyPoints := 0
	for i := 0; i < 7; i++ {
		day := sevenDaysAgo.AddDate(0, 0, i)
		key := day.Format("2006-01-02")
		dayHabits := dateCompletions[key]
		completedCount := len(dayHabits)
		for hID := range dayHabits {
			if pts, ok := pointsMap[hID]; ok {
				weeklyPoints += pts
			}
		}
		var dayRate float64
		if totalHabits > 0 {
			dayRate = float64(completedCount) / float64(totalHabits)
		}
		weeklySummary[i] = WeekDaySummary{
			Date:           key,
			DayName:        day.Format("Mon"),
			Completed:      completedCount,
			Total:          totalHabits,
			CompletionRate: dayRate,
		}
	}

	// Total points from all-time logs (already fetched above, no extra query).
	totalPoints := 0
	for _, l := range allLogs {
		if pts, ok := pointsMap[l.HabitID]; ok {
			totalPoints += pts
		}
	}

	return &DashboardStats{
		TotalHabits:    totalHabits,
		CompletedToday: completedToday,
		CompletionRate: completionRate,
		OverallStreak:  overallStreak,
		TotalPoints:    totalPoints,
		WeeklyPoints:   weeklyPoints,
		WeeklySummary:  weeklySummary,
	}, nil
}
