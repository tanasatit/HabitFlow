'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { IGoogleCalendarStatus } from '@/types/google'

export function useGoogleCalendar() {
  const [status, setStatus] = useState<IGoogleCalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    const res = await api.get<IGoogleCalendarStatus>('/google/status')
    if (res.error) {
      setError(res.error)
    } else {
      setStatus(res.data ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus().catch(() => {
      setLoading(false)
    })
  }, [fetchStatus])

  const disconnect = useCallback(async (): Promise<{ error?: string }> => {
    const res = await api.delete('/google/disconnect')
    if (res.error) return { error: res.error }
    setStatus({ connected: false, email: null, connected_at: null })
    return {}
  }, [])

  return {
    connected: status?.connected ?? false,
    email: status?.email ?? null,
    connectedAt: status?.connected_at ?? null,
    loading,
    error,
    disconnect,
    refetch: fetchStatus,
  }
}
