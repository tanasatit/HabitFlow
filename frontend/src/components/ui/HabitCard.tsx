'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StreakBadge } from './StreakBadge'
import type { IHabitWithStreak } from '@/types/habit'

interface HabitCardProps {
  habit: IHabitWithStreak
  onToggleComplete: (habitId: string) => void
  onEdit: (habitId: string) => void
  onDelete: (habitId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  health: 'bg-[#069494]/20 text-[#069494]',
  learning: 'bg-[#FF8243]/20 text-[#FF8243]',
  productivity: 'bg-[#FCE883]/20 text-[#FCE883]',
  mindfulness: 'bg-[#FFC0CB]/20 text-[#FFC0CB]',
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  custom: 'Custom',
}

const TARGET_TIME_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
}

export function HabitCard({ habit, onToggleComplete, onEdit, onDelete }: HabitCardProps) {
  const [isToggling, setIsToggling] = useState(false)
  const categoryStyle = CATEGORY_COLORS[habit.category] ?? 'bg-gray-700/50 text-gray-400'

  async function handleToggle() {
    if (isToggling) return
    setIsToggling(true)
    await onToggleComplete(habit.id)
    setIsToggling(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors group"
    >
      {/* Completion toggle button */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        aria-label={habit.completed_today ? 'Mark as incomplete' : 'Mark as complete'}
        className="mt-0.5 flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] rounded-full disabled:opacity-60"
      >
        <AnimatePresence mode="wait" initial={false}>
          {habit.completed_today ? (
            <motion.div
              key="completed"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-6 h-6 rounded-full bg-[#FF8243] flex items-center justify-center shadow-lg shadow-[#FF8243]/30"
            >
              {/* Checkmark icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-white"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="incomplete"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-[#FF8243] transition-colors"
            />
          )}
        </AnimatePresence>
      </button>

      {/* Habit info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`text-base font-semibold ${habit.completed_today ? 'text-gray-400 line-through' : 'text-white'} transition-colors`}
          >
            {habit.name}
          </span>
          {habit.category && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryStyle}`}>
              {habit.category}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>{FREQUENCY_LABELS[habit.frequency] ?? habit.frequency}</span>
          <span>&bull;</span>
          <span>{TARGET_TIME_LABELS[habit.target_time] ?? habit.target_time}</span>
          <span>&bull;</span>
          <span className="text-[#FCE883] font-medium">{habit.points} pts</span>
        </div>

        {habit.description && (
          <p className="mt-1 text-xs text-gray-500 truncate">{habit.description}</p>
        )}
      </div>

      {/* Right side: streak + actions */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <StreakBadge streak={habit.current_streak} />

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Edit button */}
          <button
            onClick={() => onEdit(habit.id)}
            aria-label={`Edit ${habit.name}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#069494] hover:bg-[#069494]/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#069494]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
          </button>

          {/* Delete button */}
          <button
            onClick={() => onDelete(habit.id)}
            aria-label={`Delete ${habit.name}`}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
