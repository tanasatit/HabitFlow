'use client'

import { useState, useCallback } from 'react'
import { ICalendarEvent, ICreateEventInput, IUpdateEventInput } from '@/types/calendar'
import { api } from '@/lib/api'

export function useCalendar() {
  const [events, setEvents] = useState<ICalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true)
    setError(null)
    const res = await api.get<ICalendarEvent[]>(`/calendar?start=${startDate}&end=${endDate}`)
    if (res.error) {
      setError(res.error)
    } else {
      setEvents(res.data ?? [])
    }
    setLoading(false)
  }, [])

  const createEvent = useCallback(async (input: ICreateEventInput): Promise<{ error?: string }> => {
    const res = await api.post<ICalendarEvent>('/calendar', input)
    if (res.error) return { error: res.error }
    if (res.data) setEvents(prev => [...prev, res.data!])
    return {}
  }, [])

  const deleteEvent = useCallback(async (id: string): Promise<{ error?: string }> => {
    const res = await api.delete(`/calendar/${id}`)
    if (res.error) return { error: res.error }
    setEvents(prev => prev.filter(e => e.id !== id))
    return {}
  }, [])

  const updateEvent = useCallback(async (id: string, input: IUpdateEventInput): Promise<{ error?: string }> => {
    const res = await api.patch<ICalendarEvent>(`/calendar/${id}`, input)
    if (res.error) return { error: res.error }
    if (res.data) setEvents(prev => prev.map(e => e.id === id ? res.data! : e))
    return {}
  }, [])

  const addEventsLocally = useCallback((newEvents: ICalendarEvent[]) => {
    setEvents(prev => {
      const ids = new Set(newEvents.map(e => e.id))
      return [...prev.filter(e => !ids.has(e.id)), ...newEvents]
    })
  }, [])

  return { events, loading, error, fetchEvents, createEvent, updateEvent, deleteEvent, addEventsLocally }
}
