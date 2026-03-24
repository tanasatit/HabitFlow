import { api } from './api'
import type { IUser } from '@/types/api'

export interface IRegisterInput {
  email: string
  password: string
  name: string
}

export interface ILoginInput {
  email: string
  password: string
}

export const authApi = {
  register: (input: IRegisterInput) => api.post<IUser>('/auth/register', input),
  login: (input: ILoginInput) => api.post<IUser>('/auth/login', input),
  logout: () => api.post<void>('/auth/logout', {}),
  me: () => api.get<IUser>('/auth/me'),
}
