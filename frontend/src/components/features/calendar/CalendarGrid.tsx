'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ICalendarEvent } from '@/types/calendar'
import { CalendarEventCard } from './CalendarEventCard'

interface Props {
  events: ICalendarEvent[]
  weekStartDate: string
  onDeleteEvent?: (id: string) => void
  onAddEvent?: (date: string) => void
  onUpdateEvent?: (id: string, scheduled_date: string) => void
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

export function CalendarGrid({ events, weekStartDate, onDeleteEvent, onAddEvent, onUpdateEvent }: Props) {
  const days = useMemo(() =>
    DAYS.map((name, i) => ({
      name,
      date: addDays(weekStartDate, i),
    })),
    [weekStartDate]
  )

  const eventsByDate = useMemo(() => {
    const map: Record<string, ICalendarEvent[]> = {}
    for (const e of events) {
      if (!map[e.scheduled_date]) map[e.scheduled_date] = []
      map[e.scheduled_date].push(e)
    }
    return map
  }, [events])

  const [today, setToday] = useState('')
  useEffect(() => { setToday(new Date().toISOString().split('T')[0]) }, [])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-7 gap-2 h-full">
      {days.map((day, colIdx) => {
        const dayEvents = eventsByDate[day.date] ?? []
        const isToday = today !== '' && day.date === today
        const isDragOver = dragOverDate === day.date
        return (
          <div
            key={day.date}
            className="flex flex-col min-h-0"
            onDragOver={e => { e.preventDefault(); setDragOverDate(day.date) }}
            onDragLeave={() => setDragOverDate(null)}
            onDrop={e => {
              e.preventDefault()
              const id = e.dataTransfer.getData('eventId')
              if (id) onUpdateEvent?.(id, day.date)
              setDraggingId(null)
              setDragOverDate(null)
            }}
          >
            <div className={`flex items-center justify-between mb-2 px-2 py-2 rounded-lg transition-colors ${
              isToday ? 'bg-teal-600 text-white' : isDragOver ? 'bg-teal-50 ring-2 ring-teal-400' : 'bg-gray-50'
            }`}>
              <div className="flex flex-col items-center flex-1">
                <p className={`text-xs font-medium ${isToday ? 'text-teal-100' : 'text-gray-500'}`}>{day.name}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{formatDay(day.date)}</p>
              </div>
              {onAddEvent && (
                <button
                  onClick={() => onAddEvent(day.date)}
                  className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${isToday ? 'hover:bg-teal-500 text-teal-100' : 'hover:bg-gray-200 text-gray-400'}`}
                  title={`Add event on ${day.date}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                </button>
              )}
            </div>
            <div className={`flex-1 overflow-y-auto min-h-[100px] rounded-lg transition-colors ${isDragOver ? 'bg-teal-50/50' : ''}`}>
              {dayEvents.length === 0 ? (
                <div className="h-8 flex items-center justify-center">
                  <div className="w-full h-px bg-gray-100 mx-1" />
                </div>
              ) : (
                dayEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: draggingId === event.id ? 0 : 1, y: 0 }}
                    transition={{ delay: colIdx * 0.03 + i * 0.05 }}
                  >
                    <CalendarEventCard
                      event={event}
                      onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
                      onDragStart={(e, id) => {
                        e.dataTransfer.setData('eventId', id)
                        setDraggingId(id)
                      }}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
