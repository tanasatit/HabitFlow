'use client'

import { useEffect, useState, useCallback } from 'react'
import { useCalendar } from '@/lib/hooks/useCalendar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useGoogleCalendar } from '@/lib/hooks/useGoogleCalendar'
import { useToast } from '@/lib/hooks/useToast'
import { CalendarGrid } from '@/components/features/calendar/CalendarGrid'
import { CreateEventModal } from '@/components/features/calendar/CreateEventModal'
import { EditEventModal } from '@/components/features/calendar/EditEventModal'
import { CalendarStatsRow } from '@/components/features/calendar/CalendarStatsRow'
import { AddEventFAB } from '@/components/features/calendar/AddEventFAB'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { CalendarSkeleton } from '@/components/ui/Skeleton'
import type { ICalendarEvent } from '@/types/calendar'

/** Format a Date as YYYY-MM-DD using LOCAL timezone (not UTC). */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns the Monday of the current week (ISO week, Mon=start). */
function getMondayWeekStart(): string {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day // adjust to Monday
  d.setDate(d.getDate() + diff)
  return toLocalDateStr(d)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
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
  const { connected: googleConnected } = useGoogleCalendar()
  const { showToast } = useToast()
  const [weekStart, setWeekStart] = useState('')
  const [addEventDate, setAddEventDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<ICalendarEvent | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWeekStart(getMondayWeekStart())
  }, [])

  // Default to true while mounting so server renders the full UI (avoids hydration mismatch)
  const isPremium = mounted ? (user?.role === 'premium' || user?.role === 'admin') : true

  useEffect(() => {
    if (!isPremium || weekStart === '') return
    fetchEvents(weekStart, addDays(weekStart, 6)).catch(() => {})
  }, [weekStart, isPremium, fetchEvents])

  const prevWeek = useCallback(() => setWeekStart(w => addDays(w, -7)), [])
  const nextWeek = useCallback(() => setWeekStart(w => addDays(w, 7)), [])
  const goToday = useCallback(() => setWeekStart(getMondayWeekStart()), [])

  const isCurrentWeek = mounted && weekStart !== '' && weekStart === getMondayWeekStart()

  async function handleDeleteEvent(id: string) {
    try {
      await deleteEvent(id)
      showToast('Event removed.', 'success')
      fetchEvents(weekStart, addDays(weekStart, 6))
    } catch {
      showToast('Could not delete event.', 'error')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold italic text-on-background">Weekly Momentum.</h1>
          <p className="text-sm text-on-surface-variant">Your AI-generated habit schedule</p>
        </div>
        {isPremium && (
          <div className="flex items-center gap-2">
            {mounted && googleConnected && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary/10 border border-tertiary/20 text-xs font-medium text-tertiary">
                <div className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                Google Calendar
              </div>
            )}
            <button
              onClick={prevWeek}
              className="p-2 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors cursor-pointer"
              title="Previous week"
            >
              ‹‹
            </button>
            <button
              onClick={goToday}
              disabled={isCurrentWeek}
              className="px-3 py-1.5 text-sm rounded-lg border border-outline hover:bg-surface-variant disabled:opacity-40 disabled:cursor-not-allowed text-on-background transition-colors cursor-pointer"
            >
              Today
            </button>
            <span className="text-sm font-medium text-on-background min-w-[180px] text-center">
              {weekStart !== '' ? formatWeekLabel(weekStart) : ''}
            </span>
            <button
              onClick={nextWeek}
              className="p-2 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors cursor-pointer"
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
        <CalendarSkeleton />
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-hidden">
            <CalendarGrid
              events={events}
              weekStartDate={weekStart}
              onDeleteEvent={handleDeleteEvent}
              onAddEvent={(date) => setAddEventDate(date)}
              onUpdateEvent={async (id, date) => { await updateEvent(id, { scheduled_date: date }) }}
              onEditEvent={(event) => setEditingEvent(event)}
            />
          </div>
          <CalendarStatsRow events={events} />
        </>
      )}

      {isPremium && mounted && weekStart !== '' && !loading && (
        <AddEventFAB onClick={() => setAddEventDate(weekStart)} />
      )}

      <CreateEventModal
        isOpen={!!addEventDate}
        defaultDate={addEventDate ?? weekStart}
        onClose={() => setAddEventDate(null)}
        onCreated={() => {
          setAddEventDate(null)
          fetchEvents(weekStart, addDays(weekStart, 6))
          showToast('Event saved.', 'success')
        }}
        createEvent={async (input) => {
          const result = await createEvent(input)
          if (result?.error) {
            showToast('Could not save event.', 'error')
          }
          return result
        }}
      />

      <EditEventModal
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onSaved={() => {
          fetchEvents(weekStart, addDays(weekStart, 6))
          showToast('Event saved.', 'success')
        }}
        updateEvent={(id, input) => updateEvent(id, input)}
        onDelete={handleDeleteEvent}
      />
    </div>
  )
}
