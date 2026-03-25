'use client'

import { useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useHabits } from '@/lib/hooks/useHabits'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { StatsCards, StatsCardsSkeleton } from '@/components/features/dashboard/StatsCards'
import { WeeklyChart, WeeklyChartSkeleton } from '@/components/features/dashboard/WeeklyChart'
import { StreakBadge } from '@/components/ui/StreakBadge'

export default function DashboardPage() {
  const { user } = useAuth()
  const { habits, loading: habitsLoading, logCompletion } = useHabits()
  const { stats, loading: dashLoading, error: dashError, refetch: refetchDashboard } =
    useDashboard()

  // Show at most 5 habits in the preview section
  const previewHabits = habits.slice(0, 5)

  const handleToggle = useCallback(
    async (habitId: string) => {
      await logCompletion(habitId)
      // Re-fetch dashboard stats after a habit is toggled so numbers stay in sync
      await refetchDashboard()
    },
    [logCompletion, refetchDashboard],
  )

  const firstName = user?.name ? user.name.split(' ')[0] : null

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-8 space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Welcome header                                                      */}
      {/* ------------------------------------------------------------------ */}
      <header>
        <h1 className="text-3xl font-bold text-white">
          {firstName ? `Welcome back, ${firstName}` : 'Your Dashboard'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {habitsLoading
            ? 'Loading your plan...'
            : habits.length > 0
              ? `${habits.filter((h) => h.completed_today).length} of ${habits.length} habits done today`
              : "Here's your plan for today"}
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Stats cards row                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Your statistics
        </h2>
        {dashLoading ? (
          <StatsCardsSkeleton />
        ) : dashError ? (
          <div
            className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-900/30 border border-red-800 text-sm text-red-300"
            role="alert"
          >
            <span>Could not load dashboard stats: {dashError}</span>
            <button
              onClick={refetchDashboard}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Retry
            </button>
          </div>
        ) : stats ? (
          <StatsCards stats={stats} />
        ) : null}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Weekly completion chart                                             */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="weekly-chart-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="weekly-chart-heading"
            className="text-lg font-semibold text-white"
          >
            Last 7 Days
          </h2>
          {stats && (
            <span className="text-xs text-gray-500">
              {Math.round(stats.completion_rate * 100)}% today
            </span>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-gray-900 border border-gray-800">
          {dashLoading ? (
            <WeeklyChartSkeleton />
          ) : stats?.weekly_summary && stats.weekly_summary.length > 0 ? (
            <WeeklyChart data={stats.weekly_summary} />
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              Complete habits to see your weekly chart.
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Today's habits                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="habits-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="habits-heading"
            className="text-lg font-semibold text-white"
          >
            Today&apos;s Habits
          </h2>
          <a
            href="/habits"
            className="text-sm text-[#069494] hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#069494] rounded"
          >
            View all
          </a>
        </div>

        {/* Loading skeleton */}
        {habitsLoading && (
          <div className="space-y-3" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-gray-900 border border-gray-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!habitsLoading && habits.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm mb-4">No habits tracked yet.</p>
            <a
              href="/habits"
              className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243]"
              style={{
                background: 'linear-gradient(135deg, #FF8243, #FFC0CB)',
              }}
            >
              Create your first habit
            </a>
          </div>
        )}

        {/* Habit rows */}
        {!habitsLoading && previewHabits.length > 0 && (
          <div className="space-y-3">
            {previewHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors group"
              >
                {/* Completion toggle */}
                <button
                  onClick={() => handleToggle(habit.id)}
                  aria-label={
                    habit.completed_today
                      ? `${habit.name} is completed. Click to undo.`
                      : `Mark ${habit.name} as complete`
                  }
                  className="flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] rounded-full"
                >
                  {habit.completed_today ? (
                    <div className="w-6 h-6 rounded-full bg-[#FF8243] flex items-center justify-center shadow-sm shadow-[#FF8243]/40">
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
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-[#FF8243] transition-colors" />
                  )}
                </button>

                {/* Habit name + category */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      habit.completed_today ? 'text-gray-500 line-through' : 'text-gray-200'
                    }`}
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
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* AI Coach CTA                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="pt-2">
        <a
          href="/ai-coach"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-[#FF8243]/25 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          style={{ background: 'linear-gradient(135deg, #FF8243, #FFC0CB)' }}
        >
          {/* Chat bubble icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          Talk to AI Coach
        </a>
      </div>
    </div>
  )
}
