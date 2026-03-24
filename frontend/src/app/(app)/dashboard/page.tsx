'use client'

import { useHabits } from '@/lib/hooks/useHabits'
import { useAuth } from '@/lib/hooks/useAuth'
import { StreakBadge } from '@/components/ui/StreakBadge'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function DashboardPage() {
  const { user } = useAuth()
  const { habits, loading, logCompletion } = useHabits()

  // Show at most 5 habits on the dashboard
  const previewHabits = habits.slice(0, 5)
  const completedToday = habits.filter((h) => h.completed_today).length

  async function handleToggle(habitId: string) {
    await logCompletion(habitId)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8">
      {/* Welcome header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Your Habits'}
        </h1>
        <p className="text-gray-400 mt-1">
          {loading
            ? 'Loading your plan...'
            : habits.length > 0
              ? `${completedToday} of ${habits.length} habits done today`
              : "Here's your plan for this week"}
        </p>
      </header>

      {/* Placeholder weekly calendar grid (Phase 4 will fill with real data) */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {DAYS.map((day) => (
          <div key={day} className="text-center">
            <p className="text-xs text-gray-500 mb-2">{day}</p>
            <div className="h-16 rounded-lg bg-gray-800 border border-gray-700" />
          </div>
        ))}
      </div>

      {/* Habit list section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Today&apos;s habits</h2>
        <a
          href="/habits"
          className="text-sm text-[#069494] hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#069494] rounded"
        >
          View all
        </a>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-gray-900 border border-gray-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && habits.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-gray-500 text-sm mb-3">No habits tracked yet.</p>
          <a
            href="/habits"
            className="inline-block px-5 py-2 rounded-xl bg-[#FF8243] hover:bg-[#e5723a] text-white text-sm font-semibold transition-colors"
          >
            Create your first habit
          </a>
        </div>
      )}

      {/* Habit rows */}
      {!loading && previewHabits.length > 0 && (
        <div className="space-y-3">
          {previewHabits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors group"
            >
              {/* Completion toggle */}
              <button
                onClick={() => handleToggle(habit.id)}
                aria-label={habit.completed_today ? `${habit.name} is completed` : `Mark ${habit.name} as complete`}
                className="flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] rounded-full"
              >
                {habit.completed_today ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF8243] flex items-center justify-center shadow-sm shadow-[#FF8243]/40">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-[#FF8243] transition-colors" />
                )}
              </button>

              {/* Name + streak */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium ${habit.completed_today ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                >
                  {habit.name}
                </span>
                {habit.category && (
                  <span className="ml-2 text-xs text-gray-500">{habit.category}</span>
                )}
              </div>

              <StreakBadge streak={habit.current_streak} />
            </div>
          ))}

          {habits.length > 5 && (
            <p className="text-center text-xs text-gray-500 pt-2">
              +{habits.length - 5} more habits.{' '}
              <a href="/habits" className="text-[#069494] hover:underline">
                View all
              </a>
            </p>
          )}
        </div>
      )}

      {/* AI Coach CTA */}
      <button className="mt-8 px-6 py-3 rounded-xl bg-[#FF8243] hover:bg-[#e5723a] text-white font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950">
        Talk to AI Coach
      </button>
    </div>
  )
}
