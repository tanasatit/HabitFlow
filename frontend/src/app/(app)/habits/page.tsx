'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useHabits } from '@/lib/hooks/useHabits'
import { HabitCard } from '@/components/ui/HabitCard'
import { HabitCreateForm } from '@/components/features/habits/HabitCreateForm'

export default function HabitsPage() {
  const router = useRouter()
  const { habits, loading, error, createHabit, logCompletion, deleteHabit } = useHabits()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleToggleComplete(habitId: string) {
    setActionError(null)
    const result = await logCompletion(habitId)
    if (result.error) {
      if (result.error.toLowerCase().includes('already logged')) {
        setActionError('This habit is already completed for today.')
      } else {
        setActionError(result.error)
      }
    }
  }

  function handleEdit(habitId: string) {
    router.push(`/habits/${habitId}`)
  }

  async function handleDeleteConfirm(habitId: string) {
    setActionError(null)
    const result = await deleteHabit(habitId)
    setDeleteConfirmId(null)
    if (result.error) {
      setActionError(result.error)
    }
  }

  function handleCreateSuccess() {
    setShowCreateForm(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Habits</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {loading ? 'Loading...' : `${habits.length} habit${habits.length === 1 ? '' : 's'} tracked`}
            </p>
          </div>

          {/* Add habit button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF8243] hover:bg-[#e5723a] text-white font-semibold text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            aria-label="Add new habit"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add habit
          </button>
        </header>

        {/* Action error banner */}
        <AnimatePresence>
          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
            >
              <span>{actionError}</span>
              <button
                onClick={() => setActionError(null)}
                className="ml-4 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                aria-label="Dismiss error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create form modal overlay */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowCreateForm(false)
              }}
            >
              <HabitCreateForm
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
                onCreate={createHabit}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg
              className="animate-spin w-8 h-8 text-[#FF8243]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading habits"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-gray-400 text-sm">Loading your habits...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && habits.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-8 h-8 text-gray-500"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">No habits yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first habit to start building better routines.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2.5 rounded-xl bg-[#FF8243] hover:bg-[#e5723a] text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Create your first habit
            </button>
          </motion.div>
        )}

        {/* Habit list */}
        {!loading && !error && habits.length > 0 && (
          <motion.div layout className="space-y-3">
            <AnimatePresence>
              {habits.map((habit) => (
                <div key={habit.id}>
                  <HabitCard
                    habit={habit}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteConfirmId(id)}
                  />

                  {/* Inline delete confirmation */}
                  <AnimatePresence>
                    {deleteConfirmId === habit.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-4 rounded-xl bg-red-950/40 border border-red-500/20 flex items-center justify-between gap-4">
                          <p className="text-sm text-red-300">
                            Delete <span className="font-semibold">{habit.name}</span>? This cannot be undone.
                          </p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(habit.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </div>
  )
}
