'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useHabits } from '@/lib/hooks/useHabits'
import { HabitEditForm } from '@/components/features/habits/HabitEditForm'
import { StreakBadge } from '@/components/ui/StreakBadge'
import type { IHabitWithStreak } from '@/types/habit'

export default function HabitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const { getHabitById, deleteHabit, updateHabit } = useHabits()
  const [habit, setHabit] = useState<IHabitWithStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) return

    async function fetchHabit() {
      setLoading(true)
      setFetchError(null)
      const data = await getHabitById(id)
      if (!data) {
        setFetchError('Habit not found')
      } else {
        setHabit(data)
      }
      setLoading(false)
    }

    fetchHabit()
  }, [id, getHabitById])

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteHabit(id)
    setIsDeleting(false)
    if (result.error) {
      setDeleteError(result.error)
      return
    }
    router.push('/habits')
  }

  function handleEditSuccess() {
    router.push('/habits')
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back nav */}
        <button
          onClick={() => router.push('/habits')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-background transition-colors cursor-pointer mb-6 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] rounded-lg"
          aria-label="Back to habits"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">Back to habits</span>
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg
              className="animate-spin w-8 h-8 text-[#FF8243]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading habit"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-on-surface-variant text-sm">Loading habit...</p>
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="py-12 text-center">
            <p className="text-red-600 text-sm mb-4">{fetchError}</p>
            <button
              onClick={() => router.push('/habits')}
              className="text-tertiary hover:underline text-sm cursor-pointer"
            >
              Go back to habits
            </button>
          </div>
        )}

        {/* Habit detail + edit form */}
        {!loading && habit && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Habit summary header */}
            <div className="p-5 rounded-2xl bg-surface border border-outline">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-on-background">{habit.name}</h1>
                  {habit.description && (
                    <p className="mt-1 text-sm text-on-surface-variant">{habit.description}</p>
                  )}
                </div>
                <StreakBadge streak={habit.current_streak} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {habit.category && (
                  <span className="px-2 py-1 rounded-full bg-surface-variant text-on-background">
                    {habit.category}
                  </span>
                )}
                <span className="px-2 py-1 rounded-full bg-surface-variant text-on-background">
                  {habit.frequency}
                </span>
                <span className="px-2 py-1 rounded-full bg-surface-variant text-on-background">
                  {habit.target_time}
                </span>
                {habit.completed_today && (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    Completed today
                  </span>
                )}
              </div>
            </div>

            {/* Edit form */}
            <HabitEditForm
              habit={habit}
              onSuccess={handleEditSuccess}
              onCancel={() => router.push('/habits')}
              onUpdate={updateHabit}
            />

            {/* Delete section */}
            <div className="p-5 rounded-2xl bg-surface border border-red-300">
              <h3 className="text-sm font-semibold text-red-600 mb-2">Danger zone</h3>
              <p className="text-xs text-on-surface-variant mb-4">
                Deleting this habit will remove it permanently. This action cannot be undone.
              </p>

              {deleteError && (
                <p className="mb-3 text-xs text-red-600">{deleteError}</p>
              )}

              <AnimatePresence mode="wait">
                {!showDeleteConfirm ? (
                  <motion.button
                    key="delete-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    Delete this habit
                  </motion.button>
                ) : (
                  <motion.div
                    key="delete-confirm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <p className="text-sm text-red-600 mr-auto">Are you sure?</p>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-background bg-surface-variant hover:bg-outline transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
