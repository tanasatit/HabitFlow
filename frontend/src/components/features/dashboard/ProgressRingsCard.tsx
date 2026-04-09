'use client'

import { motion } from 'framer-motion'

interface ProgressRingProps {
  radius: number
  stroke: number
  progress: number
  color: string
  label: string
  value: string
}

function ProgressRing({ radius, stroke, progress, color, label, value }: ProgressRingProps) {
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} aria-hidden="true">
          <circle
            stroke="#e0dad6"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <motion.circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-headline font-bold text-on-background">{value}</span>
        </div>
      </div>
      <p className="text-xs text-on-surface-variant font-medium text-center">{label}</p>
    </div>
  )
}

interface ProgressRingsCardProps {
  dailyPercent: number
  weeklyPercent: number
  completedToday: number
  totalToday: number
}

export function ProgressRingsCard({
  dailyPercent,
  weeklyPercent,
  completedToday,
  totalToday,
}: ProgressRingsCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-outline p-6 h-full min-h-[160px] flex flex-col justify-center">
      <p className="text-sm font-semibold text-on-background mb-4">Progress Overview</p>
      <div className="flex items-center justify-around gap-6">
        <ProgressRing
          radius={54}
          stroke={8}
          progress={dailyPercent}
          color="#069494"
          label="Daily Habits"
          value={`${completedToday}/${totalToday}`}
        />
        <ProgressRing
          radius={54}
          stroke={8}
          progress={weeklyPercent}
          color="#FF8243"
          label="Weekly Goal"
          value={`${Math.round(weeklyPercent)}%`}
        />
      </div>
    </div>
  )
}
