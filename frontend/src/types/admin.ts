export interface ISubDetail {
  id: string
  plan: 'free' | 'premium'
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface IUserDetail {
  id: string
  email: string
  name: string
  role: 'free' | 'premium' | 'admin'
  subscription: ISubDetail | null
  created_at: string
  updated_at: string
}

export interface IAnalytics {
  total_users: number
  free_users: number
  premium_users: number
  admin_users: number
  dau: number
}

export interface IUpdateUserInput {
  name?: string
  role?: 'free' | 'premium' | 'admin'
}
