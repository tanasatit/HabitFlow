'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { IUserDetail, IAnalytics, IUpdateUserInput } from '@/types/admin'

export function useAdminUsers() {
  const [users, setUsers] = useState<IUserDetail[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.set('search', search)
      const res = await api.paginated<IUserDetail>(`/admin/users?${params}`)
      setUsers(res.data)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const updateUser = useCallback(
    async (id: string, input: IUpdateUserInput): Promise<IUserDetail | null> => {
      const res = await api.put<IUserDetail>(`/admin/users/${id}`, input)
      if (res.data) {
        setUsers((prev) => prev.map((u) => (u.id === id ? res.data! : u)))
      }
      return res.data ?? null
    },
    [],
  )

  const deleteUser = useCallback(async (id: string): Promise<string | null> => {
    const res = await api.delete<{ message: string }>(`/admin/users/${id}`)
    if (!res.error) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
      setTotal((prev) => prev - 1)
      return null
    }
    return res.error
  }, [])

  return {
    users,
    total,
    page,
    setPage,
    limit,
    search,
    setSearch,
    loading,
    error,
    refetch: fetchUsers,
    updateUser,
    deleteUser,
  }
}

export function useAdminUser(id: string) {
  const [user, setUser] = useState<IUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await api.get<IUserDetail>(`/admin/users/${id}`)
    if (res.error) {
      setError(res.error)
    } else {
      setUser(res.data ?? null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  const updateUser = useCallback(
    async (input: IUpdateUserInput): Promise<IUserDetail | null> => {
      const res = await api.put<IUserDetail>(`/admin/users/${id}`, input)
      if (res.data) {
        setUser(res.data)
      }
      return res.data ?? null
    },
    [id],
  )

  return { user, loading, error, refetch: fetchUser, updateUser }
}

export function useAdminAnalytics() {
  const [analytics, setAnalytics] = useState<IAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await api.get<IAnalytics>('/admin/analytics')
    if (res.error) {
      setError(res.error)
    } else {
      setAnalytics(res.data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchAnalytics()
  }, [fetchAnalytics])

  return { analytics, loading, error, refetch: fetchAnalytics }
}
