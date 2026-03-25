'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { IDashboardStats } from '@/types/dashboard'

export function useDashboard() {
  const [stats, setStats] = useState<IDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const res = await api.get<IDashboardStats>('/dashboard')
    if (res.error) {
      setError(res.error)
    } else {
      setStats(res.data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { stats, loading, error, refetch: fetchDashboard }
}
