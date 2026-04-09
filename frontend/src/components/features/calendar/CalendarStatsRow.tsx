'use client'

import type { ICalendarEvent } from '@/types/calendar'

interface Props {
  events: ICalendarEvent[]
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accentClass: string
}

function StatCard({ label, value, sub, accentClass }: StatCardProps) {
  return (
    <div className="relative bg-surface border border-outline rounded-2xl p-6 overflow-hidden flex-1 min-w-0">
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentClass}`} aria-hidden="true" />
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
        {label}
      </p>
      <p className="text-3xl font-headline font-extrabold text-on-background pl-1">{value}</p>
      {sub && (
        <p className="text-xs text-on-surface-variant mt-1 pl-1">{sub}</p>
      )}
    </div>
  )
}

export function CalendarStatsRow({ events }: Props) {
  const eventCount = events.length

  const totalMinutes = events.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const hours = (totalMinutes / 60).toFixed(1)

  const habitsLinked = events.filter((e) => e.habit_id != null).length

  return (
    <div className="flex flex-col sm:flex-row gap-4 mt-4" role="region" aria-label="Calendar stats">
      <StatCard
        label="Events This Week"
        value={eventCount}
        sub={eventCount === 1 ? '1 event scheduled' : `${eventCount} events scheduled`}
        accentClass="bg-primary"
      />
      <StatCard
        label="Hours Scheduled"
        value={`${hours}h`}
        sub={`${totalMinutes} total minutes`}
        accentClass="bg-tertiary"
      />
      <StatCard
        label="Habits Linked"
        value={habitsLinked}
        sub="View Habits →"
        accentClass="bg-secondary"
      />
    </div>
  )
}
