'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { StreakFlame } from '@/components/ui/StreakFlame'
import { ProgressRing } from '@/components/ui/ProgressRing'
import type { IDashboardStats } from '@/types/dashboard'

interface StatsCardsProps {
  stats: IDashboardStats
}

interface StatCardProps {
  children: ReactNode
  label: string
  index: number
}

function StatCard({ children, label, index }: StatCardProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-gray-900 border border-gray-800 flex-1 min-w-[140px]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
    >
      {children}
      <span className="text-xs font-medium text-gray-400 text-center leading-tight">
        {label}
      </span>
    </motion.div>
  )
}

/** Animated count-up number */
function AnimatedNumber({
  value,
  suffix = '',
}: {
  value: number
  suffix?: string
}) {
  return (
    <motion.span
      className="text-2xl font-bold text-white tabular-nums"
      key={value}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'backOut' }}
    >
      {value}
      {suffix}
    </motion.span>
  )
}

export function StatsCards({ stats }: StatsCardsProps) {
  const completedLabel =
    stats.total_habits > 0
      ? `${stats.completed_today} of ${stats.total_habits}`
      : '0 of 0'

  return (
    <div
      className="flex flex-wrap gap-3 w-full"
      role="region"
      aria-label="Dashboard statistics"
    >
      {/* Card 1 — Current streak flame */}
      <StatCard label="Day Streak" index={0}>
        <StreakFlame streak={stats.overall_streak} size="md" />
      </StatCard>

      {/* Card 2 — Today's completion ring */}
      <StatCard label="Today's Progress" index={1}>
        <ProgressRing
          progress={stats.completion_rate}
          size={80}
          strokeWidth={7}
          label={completedLabel}
          ariaLabel={`Today's completion: ${completedLabel} habits done`}
        />
      </StatCard>

      {/* Card 3 — Weekly points */}
      <StatCard label="Points This Week" index={2}>
        <div className="flex items-end gap-1">
          <AnimatedNumber value={stats.weekly_points} />
          <span className="text-sm text-[#FCE883] font-semibold mb-1">pts</span>
        </div>
      </StatCard>

      {/* Card 4 — Total points */}
      <StatCard label="Total Points" index={3}>
        <div className="flex items-end gap-1">
          <AnimatedNumber value={stats.total_points} />
          <span className="text-sm text-[#FCE883] font-semibold mb-1">pts</span>
        </div>
      </StatCard>
    </div>
  )
}

/** Skeleton row shown while stats are loading */
export function StatsCardsSkeleton() {
  return (
    <div className="flex flex-wrap gap-3 w-full" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-gray-900 border border-gray-800 flex-1 min-w-[140px]"
        >
          <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
          <div className="h-3 w-20 rounded bg-gray-800 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
