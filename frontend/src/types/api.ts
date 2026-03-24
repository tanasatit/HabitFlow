export interface IApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface IApiError {
  error: string
  message?: string
}

export interface IApiListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  message?: string
}

export interface IUser {
  id: string
  email: string
  name: string
  role: 'free' | 'premium' | 'admin'
  created_at: string
}

export interface IHabit {
  id: string
  user_id: string
  title: string
  description: string
  frequency: 'daily' | 'weekly'
  target_days: number[]
  streak: number
  created_at: string
}

export interface IHabitLog {
  id: string
  habit_id: string
  completed_at: string
  note?: string
}
