'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useHabits } from '@/lib/hooks/useHabits'
import { useToast } from '@/lib/hooks/useToast'
import { HabitCreateForm } from '@/components/features/habits/HabitCreateForm'
import { HabitBentoCard } from '@/components/features/habits/HabitBentoCard'
import { CreateRitualCard } from '@/components/features/habits/CreateRitualCard'
import { HabitAIInsightCard } from '@/components/features/habits/HabitAIInsightCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { HabitsGridSkeleton } from '@/components/ui/Skeleton'

export default function HabitsPage() {
  const router = useRouter()
  const { habits, loading, error, createHabit, logCompletion, deleteHabit } = useHabits()
  const { showToast } = useToast()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  async function handleToggleComplete(habitId: string) {
    const result = await logCompletion(habitId)
    if (result.error) {
      showToast(
        result.error.toLowerCase().includes('already logged')
          ? 'Already completed for today.'
          : result.error,
        'error',
      )
    } else {
      showToast('Habit marked complete!', 'success')
    }
  }

  function handleEdit(habitId: string) {
    router.push(`/habits/${habitId}`)
  }

  async function handleDeleteConfirm(habitId: string) {
    const result = await deleteHabit(habitId)
    setDeleteConfirmId(null)
    if (result.error) {
      showToast(result.error, 'error')
    } else {
      showToast('Habit deleted.', 'info')
    }
  }

  function handleCreateSuccess() {
    setShowCreateForm(false)
    showToast('Ritual created!', 'success')
  }

  const completedToday = habits.filter((h) => h.completed_today).length

  if (loading) return <HabitsGridSkeleton />

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold italic text-on-background">
            Your Oasis.
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            {loading ? 'Loading...' : `${habits.length} ritual${habits.length === 1 ? '' : 's'} tracked`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-white font-semibold text-sm transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Add new ritual"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
          Add Ritual
        </button>
      </header>

      {/* Error state */}
      {!loading && error && (
        <div className="py-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {/* Create form modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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

      {/* Empty state */}
      {!loading && !error && habits.length === 0 && (
        <EmptyState
          icon="checklist"
          headline="No rituals yet"
          description="Create your first ritual to start building better routines."
          ctaLabel="Create your first ritual"
          onCta={() => setShowCreateForm(true)}
        />
      )}

      {/* Bento grid */}
      {!loading && !error && habits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {habits.map((habit) => (
              <div key={habit.id} className="flex flex-col gap-2">
                <HabitBentoCard
                  habit={habit}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />

                {/* Inline delete confirm */}
                <AnimatePresence>
                  {deleteConfirmId === habit.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between gap-4">
                        <p className="text-sm text-red-600">
                          Delete <span className="font-semibold">{habit.name}</span>? This cannot be undone.
                        </p>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium text-on-surface-variant bg-surface-variant hover:bg-outline transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(habit.id)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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

          {/* Create ritual card */}
          <CreateRitualCard onClick={() => setShowCreateForm(true)} />

          {/* AI Insight card spans full row at bottom */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <HabitAIInsightCard totalHabits={habits.length} completedToday={completedToday} />
          </div>
        </div>
      )}
    </div>
  )
}
