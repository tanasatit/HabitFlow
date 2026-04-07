'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCalendar } from '@/lib/hooks/useCalendar'
import { useAuth } from '@/lib/hooks/useAuth'
import { CalendarGrid } from '@/components/features/calendar/CalendarGrid'
import { CreateEventModal } from '@/components/features/calendar/CreateEventModal'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(weekStart + 'T00:00:00')
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { events, loading, fetchEvents, createEvent, deleteEvent, updateEvent } = useCalendar()
  const [weekStart, setWeekStart] = useState('')
  const [addEventDate, setAddEventDate] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWeekStart(getMonday(new Date()))
  }, [])

  // Default to true while mounting so server renders the full UI (avoids hydration mismatch)
  const isPremium = mounted ? (user?.role === 'premium' || user?.role === 'admin') : true

  useEffect(() => {
    if (!isPremium || weekStart === '') return
    fetchEvents(weekStart, addDays(weekStart, 6))
  }, [weekStart, isPremium, fetchEvents])

  const prevWeek = useCallback(() => setWeekStart(w => addDays(w, -7)), [])
  const nextWeek = useCallback(() => setWeekStart(w => addDays(w, 7)), [])
  const goToday = useCallback(() => setWeekStart(getMonday(new Date())), [])

  const isCurrentWeek = mounted && weekStart !== '' && weekStart === getMonday(new Date())

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Weekly Calendar</h1>
          <p className="text-sm text-gray-500">Your AI-generated habit schedule</p>
        </div>
        {isPremium && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Previous week"
            >
              ‹‹
            </button>
            <button
              onClick={goToday}
              disabled={isCurrentWeek}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 transition-colors"
            >
              Today
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
              {weekStart !== '' ? formatWeekLabel(weekStart) : ''}
            </span>
            <button
              onClick={nextWeek}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              title="Next week"
            >
              ››
            </button>
          </div>
        )}
      </div>

      {!isPremium ? (
        <UpgradePrompt feature="Calendar" />
      ) : !mounted || weekStart === '' || loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <CalendarGrid
            events={events}
            weekStartDate={weekStart}
            onDeleteEvent={async (id) => { await deleteEvent(id) }}
            onAddEvent={(date) => setAddEventDate(date)}
            onUpdateEvent={async (id, date) => { await updateEvent(id, { scheduled_date: date }) }}
          />
        </div>
      )}

      <CreateEventModal
        isOpen={!!addEventDate}
        defaultDate={addEventDate ?? weekStart}
        onClose={() => setAddEventDate(null)}
        onCreated={() => setAddEventDate(null)}
        createEvent={createEvent}
      />
    </div>
  )
}
