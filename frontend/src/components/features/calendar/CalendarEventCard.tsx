'use client'

import { ICalendarEvent } from '@/types/calendar'

interface Props {
  event: ICalendarEvent
  onDelete?: () => void
  onDragStart?: (e: React.DragEvent, eventId: string) => void
}

export function CalendarEventCard({ event, onDelete, onDragStart }: Props) {
  const color = event.color || '#14b8a6'
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, event.id) : undefined}
      className="group relative rounded-lg px-2 py-1.5 mb-1 text-xs cursor-grab active:cursor-grabbing select-none"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div
        className="bg-white rounded-r-lg px-2 py-1.5 -ml-2 hover:brightness-95 transition-all"
        style={{ backgroundColor: `${color}12` }}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{event.title}</p>
            <p className="text-gray-500">{event.start_time} · {event.duration_minutes}min</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {event.source === 'ai' && (
              <span
                className="text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: color }}
              >AI</span>
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
      </div>
    </div>
  )
}
