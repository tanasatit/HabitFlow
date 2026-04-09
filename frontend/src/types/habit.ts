export interface IHabit {
  id: string
  user_id: string
  name: string
  category: string
  frequency: 'daily' | 'weekdays' | 'custom'
  target_time: 'morning' | 'afternoon' | 'evening' | 'anytime'
  description: string
  is_active: boolean
  points: number
  created_at: string
  updated_at: string
}

export interface IHabitLog {
  id: string
  habit_id: string
  user_id: string
  completed_at: string
  notes: string
  created_at: string
}

export interface IHabitWithStreak extends IHabit {
  current_streak: number
  completed_today: boolean
}

export interface ICreateHabitInput {
  name: string
  category?: string
  frequency?: string
  target_time?: string
  description?: string
}

export interface IUpdateHabitInput {
  name?: string
  category?: string
  frequency?: string
  target_time?: string
  description?: string
  is_active?: boolean
}

export interface IDayCount {
  date: string // "2026-03-25"
  completed: boolean
}

export interface IHabitStats {
  habit_id: string
  name: string
  category: string
  current_streak: number
  longest_streak: number
  total_completed: number
  completion_rate: number // 0.0 - 1.0, last 30 days
  weekly_data: IDayCount[]
  completed_today: boolean
}
