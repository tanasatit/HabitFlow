package dashboard

// DashboardStats is the response DTO for the dashboard endpoint.
type DashboardStats struct {
	TotalHabits    int              `json:"total_habits"`
	CompletedToday int              `json:"completed_today"`
	CompletionRate float64          `json:"completion_rate"`  // 0.0 - 1.0, today's completions / total habits
	OverallStreak  int              `json:"overall_streak"`   // longest current streak across all habits
	TotalPoints    int              `json:"total_points"`     // total points earned all time
	WeeklyPoints   int              `json:"weekly_points"`    // points earned this week
	WeeklySummary  []WeekDaySummary `json:"weekly_summary"`   // last 7 days
}

// WeekDaySummary holds per-day aggregation for the weekly chart.
type WeekDaySummary struct {
	Date           string  `json:"date"`            // "2026-03-25"
	DayName        string  `json:"day_name"`        // "Tue"
	Completed      int     `json:"completed"`       // number of habits completed
	Total          int     `json:"total"`           // total active habits on that day
	CompletionRate float64 `json:"completion_rate"` // 0.0 - 1.0
}
