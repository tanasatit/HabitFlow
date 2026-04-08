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
  google_id?: string
  avatar_url?: string
  created_at: string
}

// IHabit and IHabitLog have been moved to types/habit.ts (Phase 3)
