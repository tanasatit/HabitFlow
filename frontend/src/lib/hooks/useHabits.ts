'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type {
  IHabit,
  IHabitWithStreak,
  IHabitLog,
  ICreateHabitInput,
  IUpdateHabitInput,
} from '@/types/habit'

export function useHabits() {
  const [habits, setHabits] = useState<IHabitWithStreak[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHabits = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const res = await api.get<IHabitWithStreak[]>('/habits')
    if (res.error) {
      setError(res.error)
    } else {
      setHabits(res.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const getHabitById = useCallback(async (id: string): Promise<IHabitWithStreak | null> => {
    const res = await api.get<IHabitWithStreak>(`/habits/${id}`)
    return res.data ?? null
  }, [])

  const createHabit = useCallback(
    async (input: ICreateHabitInput): Promise<{ error?: string }> => {
      const res = await api.post<IHabit>('/habits', input)
      if (res.error) {
        return { error: res.error }
      }
      await fetchHabits()
      return {}
    },
    [fetchHabits],
  )

  const updateHabit = useCallback(
    async (id: string, input: IUpdateHabitInput): Promise<{ error?: string }> => {
      const res = await api.put<IHabitWithStreak>(`/habits/${id}`, input)
      if (res.error) {
        return { error: res.error }
      }
      await fetchHabits()
      return {}
    },
    [fetchHabits],
  )

  const deleteHabit = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      const res = await api.delete<{ message: string }>(`/habits/${id}`)
      if (res.error) {
        return { error: res.error }
      }
      await fetchHabits()
      return {}
    },
    [fetchHabits],
  )

  const logCompletion = useCallback(
    async (habitId: string, notes?: string): Promise<{ error?: string }> => {
      const res = await api.post<IHabitLog>(`/habits/${habitId}/log`, {
        notes: notes ?? '',
      })
      if (res.error) {
        return { error: res.error }
      }
      await fetchHabits()
      return {}
    },
    [fetchHabits],
  )

  return {
    habits,
    loading,
    error,
    getHabitById,
    createHabit,
    updateHabit,
    deleteHabit,
    logCompletion,
    refetch: fetchHabits,
  }
}
