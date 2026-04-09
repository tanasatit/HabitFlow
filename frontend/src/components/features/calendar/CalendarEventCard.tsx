'use client'

import { ICalendarEvent } from '@/types/calendar'

interface Props {
  event: ICalendarEvent
  style?: React.CSSProperties
  onDelete?: () => void
  onDragStart?: (e: React.DragEvent, eventId: string) => void
  onClick?: (event: ICalendarEvent) => void
}

function getSourceClasses(source: ICalendarEvent['source']): string {
  if (source === 'ai') return 'bg-tertiary text-white'
  if (source === 'google') return 'bg-secondary text-on-background'
  return 'bg-primary text-white'
}

function getSourceBadgeClasses(source: ICalendarEvent['source']): string {
  if (source === 'ai') return 'bg-white/20 text-white'
  if (source === 'google') return 'bg-on-background/10 text-on-background'
  return 'bg-white/20 text-white'
}

export function CalendarEventCard({ event, style, onDelete, onDragStart, onClick }: Props) {
  const isPositioned = !!(style && style.position === 'absolute')
  const sourceClasses = getSourceClasses(event.source)
  const badgeClasses = getSourceBadgeClasses(event.source)

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, event.id) : undefined}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(event) } : undefined}
      className={`group relative rounded-2xl cursor-grab active:cursor-grabbing select-none overflow-hidden hover:scale-[1.02] transition-transform duration-150 ${sourceClasses}`}
      style={style}
    >
      <div className="px-1.5 py-1 h-full overflow-hidden">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="font-semibold truncate text-[11px] leading-tight">
              {event.title}
            </p>
            {(!isPositioned || (style?.height != null && parseFloat(String(style.height)) > 40)) && event.start_time && (
              <p className="opacity-80 text-[10px] leading-tight truncate">
                {event.start_time}
                {event.duration_minutes ? ` · ${event.duration_minutes}min` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {event.source === 'google' && (
              <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium leading-none ${badgeClasses}`}>
                G
              </span>
            )}
            {event.source === 'ai' && (
              <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium leading-none ${badgeClasses}`}>
                AI
              </span>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                aria-label={`Delete event: ${event.title}`}
                className="opacity-0 group-hover:opacity-100 hover:text-red-200 transition-opacity cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
