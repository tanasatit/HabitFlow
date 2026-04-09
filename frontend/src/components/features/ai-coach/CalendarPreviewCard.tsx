'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ICalendarEvent } from '@/types/calendar'

interface Props {
  events: ICalendarEvent[]
}

export function CalendarPreviewCard({ events }: Props) {
  return (
    <div className="bg-white border border-teal-100 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs font-semibold text-teal-700">
          {events.length} event{events.length !== 1 ? 's' : ''} added to calendar
        </span>
      </div>
      <div className="space-y-1">
        {events.slice(0, 3).map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 text-xs text-gray-600"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
            <span className="font-medium">{event.scheduled_date}</span>
            <span>{event.start_time}</span>
            <span className="truncate">{event.title}</span>
          </motion.div>
        ))}
        {events.length > 3 && (
          <p className="text-xs text-gray-400 pl-3.5">+{events.length - 3} more</p>
        )}
      </div>
      <Link href="/calendar" className="block mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium">
        View in Calendar →
      </Link>
    </div>
  )
}
