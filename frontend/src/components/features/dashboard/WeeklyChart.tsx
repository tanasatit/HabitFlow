'use client'

import { motion } from 'framer-motion'
import type { IWeekDaySummary } from '@/types/dashboard'

interface WeeklyChartProps {
  data: IWeekDaySummary[]
}

const MAX_BAR_HEIGHT = 120 // px

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return dateStr === today
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No weekly data available yet.
      </div>
    )
  }

  return (
    <div
      className="flex items-end justify-between gap-2 w-full"
      role="img"
      aria-label="Weekly habit completion chart"
    >
      {data.map((day, index) => {
        const today = isToday(day.date)
        const barHeight = Math.max(4, Math.round(day.completion_rate * MAX_BAR_HEIGHT))
        const barColor = today ? '#FF8243' : '#069494'
        const barOpacity = today ? 1 : 0.4 + day.completion_rate * 0.6

        return (
          <div
            key={day.date}
            className="flex flex-col items-center gap-2 flex-1 min-w-0"
            title={`${day.day_name}: ${day.completed}/${day.total} habits`}
          >
            {/* Count label above bar */}
            <span
              className="text-xs font-medium leading-none"
              style={{ color: today ? '#FF8243' : '#9CA3AF' }}
              aria-hidden="true"
            >
              {day.completed}/{day.total}
            </span>

            {/* Bar track */}
            <div
              className="relative w-full rounded-t-md overflow-hidden"
              style={{ height: MAX_BAR_HEIGHT, backgroundColor: '#1F2937' }}
            >
              <motion.div
                className="absolute bottom-0 left-0 right-0 rounded-t-md"
                style={{
                  backgroundColor: barColor,
                  opacity: barOpacity,
                }}
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.05,
                  ease: 'easeOut',
                }}
                aria-hidden="true"
              />
            </div>

            {/* Day label */}
            <span
              className="text-xs leading-none font-medium truncate w-full text-center"
              style={{ color: today ? '#FF8243' : '#6B7280' }}
            >
              {day.day_name}
            </span>

            {/* Today indicator dot */}
            {today && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#FF8243' }}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Skeleton placeholder shown while data is loading */
export function WeeklyChartSkeleton() {
  return (
    <div className="flex items-end justify-between gap-2 w-full" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1">
          <div className="text-xs text-transparent select-none">0/0</div>
          <div
            className="w-full rounded-t-md bg-gray-800 animate-pulse"
            style={{
              height: MAX_BAR_HEIGHT,
              opacity: 0.4 + (i % 3) * 0.2,
            }}
          />
          <div className="h-3 w-6 rounded bg-gray-800 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
