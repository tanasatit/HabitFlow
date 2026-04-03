'use client'

import { motion } from 'framer-motion'
import { ICalendarEvent } from '@/types/calendar'

interface Props {
  event: ICalendarEvent
  onDelete?: () => void
}

export function CalendarEventCard({ event, onDelete }: Props) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="group relative rounded-lg px-2 py-1.5 mb-1 text-xs cursor-default bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-semibold text-teal-800 truncate">{event.title}</p>
          <p className="text-teal-600">{event.start_time} · {event.duration_minutes}min</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {event.source === 'ai' && (
            <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">AI</span>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label={`Delete event: ${event.title}`}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
