export interface IDashboardStats {
  total_habits: number
  completed_today: number
  completion_rate: number // 0.0 - 1.0
  overall_streak: number
  total_points: number
  weekly_points: number
  weekly_summary: IWeekDaySummary[]
}

export interface IWeekDaySummary {
  date: string // "2026-03-25"
  day_name: string // "Tue"
  completed: number
  total: number
  completion_rate: number // 0.0 - 1.0
}
