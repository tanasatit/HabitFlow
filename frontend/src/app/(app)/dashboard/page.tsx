'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useHabits } from '@/lib/hooks/useHabits'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useToast } from '@/lib/hooks/useToast'
import { HeroGreeting } from '@/components/features/dashboard/HeroGreeting'
import { StreakCard } from '@/components/features/dashboard/StreakCard'
import { ProgressRingsCard } from '@/components/features/dashboard/ProgressRingsCard'
import { TodayRitualsList } from '@/components/features/dashboard/TodayRitualsList'
import { AIInsightCard } from '@/components/features/dashboard/AIInsightCard'
import { UpgradePromo } from '@/components/ui/UpgradePromo'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardSkeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  const { user } = useAuth()
  const { habits, loading: habitsLoading, logCompletion } = useHabits()
  const { stats, loading: dashLoading, error: dashError, refetch: refetchDashboard } =
    useDashboard()
  const { showToast } = useToast()

  const previewHabits = habits.slice(0, 5)

  const handleToggle = useCallback(
    async (habitId: string) => {
      const result = await logCompletion(habitId)
      if (result.error) {
        showToast(
          result.error.toLowerCase().includes('already logged')
            ? 'Already completed for today.'
            : result.error,
          'error',
        )
      }
      await refetchDashboard()
    },
    [logCompletion, refetchDashboard, showToast],
  )

  const firstName = user?.name ? user.name.split(' ')[0] : null

  if (habitsLoading || dashLoading) {
    return <DashboardSkeleton />
  }

  const completedToday = habits.filter((h) => h.completed_today).length
  const totalHabits = habits.length
  const dailyPercent = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0
  const weeklyPercent = stats ? Math.round(stats.completion_rate * 100) : 0

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Hero greeting */}
      <HeroGreeting
        name={firstName}
        subtitle={
          habits.length > 0
            ? `${completedToday} of ${totalHabits} rituals done today`
            : "Here's your plan for today"
        }
      />

      {/* Error banner */}
      {dashError && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-600" role="alert">
          <span>Could not load stats: {dashError}</span>
          <button
            onClick={refetchDashboard}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* 12-col hero row */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4">
          <StreakCard streak={stats?.overall_streak ?? 0} />
        </div>
        <div className="col-span-12 md:col-span-8">
          <ProgressRingsCard
            dailyPercent={dailyPercent}
            weeklyPercent={weeklyPercent}
            completedToday={completedToday}
            totalToday={totalHabits}
          />
        </div>
      </div>

      {/* Main content + right column */}
      <div className="grid grid-cols-12 gap-6">
        {/* Today's Rituals */}
        <section className="col-span-12 lg:col-span-8" aria-labelledby="rituals-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="rituals-heading" className="text-lg font-headline font-bold text-on-background">
              Today&apos;s Rituals
            </h2>
            <Link
              href="/habits"
              className="text-sm text-tertiary hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              View all
            </Link>
          </div>

          {!habitsLoading && habits.length === 0 ? (
            <EmptyState
              icon="checklist"
              headline="No habits yet"
              description="Create your first ritual to start building better routines."
            />
          ) : (
            <>
              <TodayRitualsList habits={previewHabits} onToggle={handleToggle} />
              {habits.length > 5 && (
                <p className="text-center text-xs text-on-surface-variant pt-4">
                  +{habits.length - 5} more habits.{' '}
                  <Link href="/habits" className="text-tertiary hover:underline">
                    View all
                  </Link>
                </p>
              )}
            </>
          )}
        </section>

        {/* Right column */}
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <AIInsightCard />
          <UpgradePromo />
        </aside>
      </div>
    </div>
  )
}
