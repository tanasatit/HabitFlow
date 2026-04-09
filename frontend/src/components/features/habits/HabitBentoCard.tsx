'use client'

import { motion } from 'framer-motion'
import type { IHabitWithStreak } from '@/types/habit'

interface HabitBentoCardProps {
  habit: IHabitWithStreak
  onToggleComplete: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  health: 'favorite',
  fitness: 'fitness_center',
  mindfulness: 'self_improvement',
  productivity: 'work',
  learning: 'school',
  social: 'people',
}

const CATEGORY_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  health: { bg: 'bg-green-100', text: 'text-green-700' },
  fitness: { bg: 'bg-orange-100', text: 'text-orange-700' },
  mindfulness: { bg: 'bg-purple-100', text: 'text-purple-700' },
  productivity: { bg: 'bg-blue-100', text: 'text-blue-700' },
  learning: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  social: { bg: 'bg-pink-100', text: 'text-pink-700' },
}

function getCategoryStyle(category: string | undefined) {
  if (!category) return { bg: 'bg-surface-variant', text: 'text-on-surface-variant' }
  return CATEGORY_COLOR_MAP[category.toLowerCase()] ?? { bg: 'bg-surface-variant', text: 'text-on-surface-variant' }
}

function getCategoryIcon(category: string | undefined): string {
  if (!category) return 'star'
  return CATEGORY_ICON_MAP[category.toLowerCase()] ?? 'star'
}

export function HabitBentoCard({ habit, onToggleComplete, onEdit, onDelete }: HabitBentoCardProps) {
  const catStyle = getCategoryStyle(habit.category)
  const icon = getCategoryIcon(habit.category)
  const completionPercent = habit.current_streak > 0
    ? Math.min(100, Math.round((habit.current_streak / 30) * 100))
    : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="relative bg-surface border border-outline rounded-2xl p-5 flex flex-col gap-3 overflow-hidden hover:shadow-md transition-shadow duration-200 group"
    >
      {/* Icon + category pill */}
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catStyle.bg} ${catStyle.text}`}>
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            {icon}
          </span>
        </div>
        {habit.category && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${catStyle.bg} ${catStyle.text}`}>
            {habit.category}
          </span>
        )}
      </div>

      {/* Name + desc */}
      <div className="flex-1">
        <p className={`text-sm font-semibold text-on-background ${habit.completed_today ? 'line-through opacity-60' : ''}`}>
          {habit.name}
        </p>
        {habit.description && (
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
            {habit.description}
          </p>
        )}
      </div>

      {/* Streak + completion */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            local_fire_department
          </span>
          <span className="text-xs font-semibold text-primary">{habit.current_streak} day streak</span>
        </div>
        <span className="text-xs text-on-surface-variant">{completionPercent}%</span>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <motion.button
          whileTap={{ scale: [1, 1.3, 1] }}
          onClick={() => onToggleComplete(habit.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            habit.completed_today
              ? 'bg-surface-variant text-on-surface-variant'
              : 'bg-primary text-white hover:opacity-90'
          }`}
          aria-label={habit.completed_today ? 'Mark incomplete' : 'Mark complete'}
        >
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
            {habit.completed_today ? 'undo' : 'check'}
          </span>
          {habit.completed_today ? 'Done' : 'Complete'}
        </motion.button>
        <button
          onClick={() => onEdit(habit.id)}
          className="p-1.5 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Edit ${habit.name}`}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
        </button>
        <button
          onClick={() => onDelete(habit.id)}
          className="p-1.5 rounded-full hover:bg-red-50 text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label={`Delete ${habit.name}`}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
        </button>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-surface-variant rounded-b-2xl overflow-hidden">
        <div
          className="absolute bottom-0 left-0 h-1.5 bg-tertiary rounded-r-full transition-all duration-700"
          style={{ width: `${completionPercent}%` }}
        />
      </div>
    </motion.div>
  )
}
