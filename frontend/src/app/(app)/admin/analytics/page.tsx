'use client'

import { motion } from 'framer-motion'
import { useAdminAnalytics } from '@/lib/hooks/useAdmin'
import { AnalyticsCards, AnalyticsCardsSkeleton } from '@/components/features/admin/AnalyticsCards'

export default function AdminAnalyticsPage() {
  const { analytics, loading, error, refetch } = useAdminAnalytics()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-background">Platform Analytics</h1>
          <p className="text-sm text-on-surface-variant mt-1">Live overview of HabitFlow user activity</p>
        </div>

        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-variant hover:bg-outline text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          aria-label="Refresh analytics"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
              clipRule="evenodd"
            />
          </svg>
          Refresh
        </button>
      </motion.header>

      {/* Error state */}
      {error && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          role="alert"
        >
          <span>Could not load analytics: {error}</span>
          <button
            onClick={refetch}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <AnalyticsCardsSkeleton />
      ) : analytics ? (
        <AnalyticsCards analytics={analytics} />
      ) : null}

      {/* User breakdown note */}
      {analytics && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-5 rounded-2xl bg-surface border border-outline"
          aria-label="User distribution breakdown"
        >
          <h2 className="text-sm font-semibold text-on-background mb-4">User Distribution</h2>

          <div className="space-y-3">
            {/* Free bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
                <span>Free</span>
                <span>
                  {analytics.free_users.toLocaleString()} (
                  {analytics.total_users > 0
                    ? Math.round((analytics.free_users / analytics.total_users) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-variant overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      analytics.total_users > 0
                        ? `${(analytics.free_users / analytics.total_users) * 100}%`
                        : '0%',
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  className="h-full rounded-full bg-outline"
                />
              </div>
            </div>

            {/* Premium bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
                <span>Premium</span>
                <span>
                  {analytics.premium_users.toLocaleString()} (
                  {analytics.total_users > 0
                    ? Math.round((analytics.premium_users / analytics.total_users) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-variant overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      analytics.total_users > 0
                        ? `${(analytics.premium_users / analytics.total_users) * 100}%`
                        : '0%',
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                  className="h-full rounded-full bg-tertiary"
                />
              </div>
            </div>

            {/* Admin bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5">
                <span>Admin</span>
                <span>
                  {analytics.admin_users.toLocaleString()} (
                  {analytics.total_users > 0
                    ? Math.round((analytics.admin_users / analytics.total_users) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-variant overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      analytics.total_users > 0
                        ? `${(analytics.admin_users / analytics.total_users) * 100}%`
                        : '0%',
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
