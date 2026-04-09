'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { IHabitWithStreak } from '@/types/habit'

interface TodayRitualsListProps {
  habits: IHabitWithStreak[]
  onToggle: (habitId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  health: 'bg-green-100 text-green-700',
  fitness: 'bg-orange-100 text-orange-700',
  mindfulness: 'bg-purple-100 text-purple-700',
  productivity: 'bg-blue-100 text-blue-700',
  learning: 'bg-yellow-100 text-yellow-700',
  social: 'bg-pink-100 text-pink-700',
}

function getCategoryStyle(category: string | undefined): string {
  if (!category) return 'bg-surface-variant text-on-surface-variant'
  const key = category.toLowerCase()
  return CATEGORY_COLORS[key] ?? 'bg-surface-variant text-on-surface-variant'
}

function getCategoryIcon(category: string | undefined): string {
  if (!category) return 'star'
  const map: Record<string, string> = {
    health: 'favorite',
    fitness: 'fitness_center',
    mindfulness: 'self_improvement',
    productivity: 'work',
    learning: 'school',
    social: 'people',
  }
  return map[category.toLowerCase()] ?? 'star'
}

interface HabitRowProps {
  habit: IHabitWithStreak
  onToggle: (id: string) => void
}

function HabitRow({ habit, onToggle }: HabitRowProps) {
  const catStyle = getCategoryStyle(habit.category)
  const icon = getCategoryIcon(habit.category)

  return (
    <motion.div
      layout
      animate={habit.completed_today ? { backgroundColor: ['#FFC0CB33', 'rgba(255,255,255,1)'] } : {}}
      transition={{ duration: 0.4 }}
      className={`flex items-center gap-4 p-4 rounded-2xl bg-surface border border-outline hover:border-outline transition-all duration-200 ${
        habit.completed_today ? 'opacity-60' : ''
      }`}
    >
      {/* Icon square */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catStyle}`}>
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
          {icon}
        </span>
      </div>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            habit.completed_today ? 'line-through text-on-surface-variant' : 'text-on-background'
          }`}
        >
          {habit.name}
        </p>
        {habit.category && (
          <p className="text-xs text-on-surface-variant capitalize mt-0.5">{habit.category}</p>
        )}
      </div>

      {/* Streak */}
      {habit.current_streak > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            local_fire_department
          </span>
          <span className="text-xs font-semibold text-primary">{habit.current_streak}</span>
        </div>
      )}

      {/* Checkbox */}
      <motion.button
        onClick={() => onToggle(habit.id)}
        whileTap={{ scale: [1, 1.3, 1] }}
        aria-label={
          habit.completed_today
            ? `${habit.name} is completed. Click to undo.`
            : `Mark ${habit.name} as complete`
        }
        className="flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
      >
        <AnimatePresence mode="wait" initial={false}>
          {habit.completed_today ? (
            <motion.div
              key="checked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="w-6 h-6 rounded-full bg-tertiary flex items-center justify-center shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
                check
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="unchecked"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="w-6 h-6 rounded-full border-2 border-outline hover:border-primary transition-colors"
            />
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  )
}

export function TodayRitualsList({ habits, onToggle }: TodayRitualsListProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} onToggle={onToggle} />
        ))}
      </AnimatePresence>
    </div>
  )
}
