'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authApi, type ILoginInput, type IRegisterInput } from '@/lib/auth'
import type { IUser } from '@/types/api'

interface IAuthContext {
  user: IUser | null
  loading: boolean
  login: (input: ILoginInput) => Promise<string | null>
  register: (input: IRegisterInput) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<IAuthContext | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    authApi.me().then((res) => {
      setUser(res.data ?? null)
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (input: ILoginInput): Promise<string | null> => {
    const res = await authApi.login(input)
    if (res.error) return res.error
    setUser(res.data ?? null)
    return null
  }, [])

  const register = useCallback(async (input: IRegisterInput): Promise<string | null> => {
    const res = await authApi.register(input)
    if (res.error) return res.error
    setUser(res.data ?? null)
    return null
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): IAuthContext {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
