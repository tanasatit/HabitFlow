'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { ICalendarEvent } from '@/types/calendar'
import { CalendarEventCard } from './CalendarEventCard'

interface Props {
  events: ICalendarEvent[]
  weekStartDate: string
  onDeleteEvent?: (id: string) => void
  onAddEvent?: (date: string) => void
  onUpdateEvent?: (id: string, scheduled_date: string) => void
  onEditEvent?: (event: ICalendarEvent) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const HOUR_HEIGHT = 64 // px per hour
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT // 1536px

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

/** Parse "HH:MM" or "" → minutes from midnight, or null if empty/invalid */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  if (parts.length < 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

const PX_PER_MIN = HOUR_HEIGHT / 60 // ~1.067px per minute

function computeEventStyle(event: ICalendarEvent): React.CSSProperties {
  const minutes = parseTimeToMinutes(event.start_time)
  if (minutes === null) return {}
  const top = Math.round(minutes * PX_PER_MIN)
  const height = Math.round(Math.max(event.duration_minutes || 30, 30) * PX_PER_MIN)
  return {
    position: 'absolute',
    top: `${top}px`,
    height: `${height}px`,
    left: '2px',
    right: '2px',
  }
}

function CurrentTimeIndicator() {
  const [topPx, setTopPx] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const calc = () => {
      const now = new Date()
      return Math.round((now.getHours() * 60 + now.getMinutes()) * (HOUR_HEIGHT / 60))
    }
    setTopPx(calc())
    setMounted(true)
    const interval = setInterval(() => setTopPx(calc()), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${topPx}px` }}
    >
      {/* Dot on the left */}
      <div
        className="absolute rounded-full"
        style={{
          width: 10,
          height: 10,
          background: '#0d9488',
          left: -5,
          top: -4,
        }}
      />
      {/* Horizontal line */}
      <div className="w-full border-t-2" style={{ borderColor: '#0d9488' }} />
    </div>
  )
}

interface DayHeaderProps {
  name: string
  label: string
  date: string
  isToday: boolean
  onAddEvent?: (date: string) => void
  showAdd: boolean
}

function DayHeader({ name: _name, label, date, isToday, onAddEvent, showAdd }: DayHeaderProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex-1 flex flex-col items-center py-2 gap-0.5 relative border-l border-gray-200 first:border-l-0 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-[11px] font-medium text-gray-500 tracking-wide">{label}</span>
      <div
        className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors"
        style={isToday ? { background: '#0d9488', color: '#fff' } : { color: '#374151' }}
      >
        {formatDay(date)}
      </div>
      {showAdd && onAddEvent && (hovered || isToday) && (
        <button
          onClick={() => onAddEvent(date)}
          title={`Add event on ${date}`}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function CalendarGrid({ events, weekStartDate, onDeleteEvent, onAddEvent, onUpdateEvent, onEditEvent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() =>
    DAYS.map((name, i) => ({
      name,
      label: DAY_LABELS[i],
      date: addDays(weekStartDate, i),
    })),
    [weekStartDate]
  )

  const [today, setToday] = useState('')
  useEffect(() => { setToday(toLocalDateStr(new Date())) }, [])

  // Auto-scroll to 7 AM on mount (7 * 64px = 448px)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT // 448px
    }
  }, [])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // Split events into timed and all-day
  const { timedByDate, allDayEvents } = useMemo(() => {
    const timedMap: Record<string, ICalendarEvent[]> = {}
    const allDay: ICalendarEvent[] = []
    for (const e of events) {
      if (!e.start_time) {
        allDay.push(e)
      } else {
        if (!timedMap[e.scheduled_date]) timedMap[e.scheduled_date] = []
        timedMap[e.scheduled_date].push(e)
      }
    }
    return { timedByDate: timedMap, allDayEvents: allDay }
  }, [events])

  const allDayByDate = useMemo(() => {
    const map: Record<string, ICalendarEvent[]> = {}
    for (const e of allDayEvents) {
      if (!map[e.scheduled_date]) map[e.scheduled_date] = []
      map[e.scheduled_date].push(e)
    }
    return map
  }, [allDayEvents])

  const hasAllDay = allDayEvents.length > 0

  // Hours 1-23 for labels (skip 0 to avoid overlap with header border)
  const HOUR_LABELS = Array.from({ length: 23 }, (_, i) => i + 1)
  // All 24 hours for grid lines
  const HOUR_LINES = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white rounded-lg border border-gray-200">
      {/* Day header row */}
      <div className="flex border-b border-gray-200 bg-white z-10 sticky top-0 shrink-0">
        {/* Gutter spacer */}
        <div className="shrink-0" style={{ width: 52 }} />
        {days.map((day) => {
          const isToday = today !== '' && day.date === today
          return (
            <DayHeader
              key={day.date}
              name={day.name}
              label={day.label}
              date={day.date}
              isToday={isToday}
              onAddEvent={onAddEvent}
              showAdd={!!onAddEvent}
            />
          )
        })}
      </div>

      {/* All-day strip */}
      {hasAllDay && (
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0" style={{ minHeight: 32 }}>
          <div
            className="shrink-0 flex items-center justify-end pr-2 text-[10px] text-gray-400 font-medium"
            style={{ width: 52 }}
          >
            all-day
          </div>
          {days.map((day) => {
            const dayAllDay = allDayByDate[day.date] ?? []
            return (
              <div key={day.date} className="flex-1 border-l border-gray-200 px-1 py-0.5 min-h-[28px]">
                {dayAllDay.map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                    onClick={onEditEvent}
                    onDragStart={(e, id) => {
                      e.dataTransfer.setData('eventId', id)
                      setDraggingId(id)
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Time gutter */}
          <div className="shrink-0 relative" style={{ width: 52 }}>
            {HOUR_LABELS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[11px] text-gray-400 select-none -translate-y-1/2"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const isToday = today !== '' && day.date === today
            const dayEvents = timedByDate[day.date] ?? []
            const isDragOver = dragOverDate === day.date

            return (
              <div
                key={day.date}
                className={`flex-1 relative border-l border-gray-200 transition-colors ${isDragOver ? 'bg-teal-50/40' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(day.date) }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('eventId')
                  if (id) onUpdateEvent?.(id, day.date)
                  setDraggingId(null)
                  setDragOverDate(null)
                }}
              >
                {/* Hour grid lines */}
                {HOUR_LINES.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator — only on today */}
                {isToday && <CurrentTimeIndicator />}

                {/* Timed events */}
                {dayEvents.map((event) => {
                  const style = computeEventStyle(event)
                  return (
                    <div
                      key={event.id}
                      style={{ opacity: draggingId === event.id ? 0 : 1 }}
                    >
                      <CalendarEventCard
                        event={event}
                        style={style}
                        onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                        onClick={onEditEvent}
                        onDragStart={(e, id) => {
                          e.dataTransfer.setData('eventId', id)
                          setDraggingId(id)
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
