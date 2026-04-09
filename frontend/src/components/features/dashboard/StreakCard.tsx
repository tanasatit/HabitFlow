'use client'

import { motion } from 'framer-motion'

interface StreakCardProps {
  streak: number
}

export function StreakCard({ streak }: StreakCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-outline p-6 flex flex-col items-center justify-center gap-3 h-full min-h-[160px]">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <span
          className="material-symbols-outlined text-[48px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          local_fire_department
        </span>
      </motion.div>
      <div className="text-center">
        <p className="text-6xl font-headline font-extrabold text-primary leading-none">{streak}</p>
        <p className="text-sm text-on-surface-variant mt-1 font-medium">day streak</p>
      </div>
    </div>
  )
}
