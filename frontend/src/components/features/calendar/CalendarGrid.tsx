'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ICalendarEvent } from '@/types/calendar'
import { CalendarEventCard } from './CalendarEventCard'

interface Props {
  events: ICalendarEvent[]
  weekStartDate: string
  onDeleteEvent?: (id: string) => void
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

export function CalendarGrid({ events, weekStartDate, onDeleteEvent }: Props) {
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

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="grid grid-cols-7 gap-2 h-full">
      {days.map((day, colIdx) => {
        const dayEvents = eventsByDate[day.date] ?? []
        const isToday = day.date === today
        return (
          <div key={day.date} className="flex flex-col min-h-0">
            <div className={`text-center mb-2 py-2 rounded-lg ${isToday ? 'bg-teal-600 text-white' : 'bg-gray-50'}`}>
              <p className={`text-xs font-medium ${isToday ? 'text-teal-100' : 'text-gray-500'}`}>{day.name}</p>
              <p className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-800'}`}>{formatDay(day.date)}</p>
            </div>
            <div className="flex-1 overflow-y-auto min-h-[100px]">
              {dayEvents.length === 0 ? (
                <div className="h-8 flex items-center justify-center">
                  <div className="w-full h-px bg-gray-100 mx-1" />
                </div>
              ) : (
                dayEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: colIdx * 0.03 + i * 0.05 }}
                  >
                    <CalendarEventCard
                      event={event}
                      onDelete={onDeleteEvent ? () => onDeleteEvent(event.id) : undefined}
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
