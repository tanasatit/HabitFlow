'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import type { IAnalytics } from '@/types/admin'

interface AnalyticsCardsProps {
  analytics: IAnalytics
}

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString())
  const prevValue = useRef(0)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.2,
      ease: 'easeOut',
      from: prevValue.current,
    })
    prevValue.current = value
    return controls.stop
  }, [value, motionVal])

  return <motion.span>{rounded}</motion.span>
}

interface StatCardProps {
  label: string
  value: number
  accentColor: string
  icon: React.ReactNode
  description?: string
}

function StatCard({ label, value, accentColor, icon, description }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-xl bg-gray-900 border border-gray-800 p-6 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 font-medium">{label}</span>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}20` }}
          aria-hidden="true"
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-bold tracking-tight"
          style={{ color: accentColor }}
          aria-label={`${label}: ${value.toLocaleString()}`}
        >
          <AnimatedNumber value={value} />
        </p>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
    </motion.div>
  )
}

export function AnalyticsCards({ analytics }: AnalyticsCardsProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      aria-label="Platform analytics"
    >
      <StatCard
        label="Total Users"
        value={analytics.total_users}
        accentColor="#FF8243"
        description="All registered accounts"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
          </svg>
        }
      />

      <StatCard
        label="Premium Users"
        value={analytics.premium_users}
        accentColor="#069494"
        description="Active paying subscribers"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M10 1c-1.716 0-3.408.106-5.07.31C3.806 1.45 3 2.414 3 3.517V16.5a.5.5 0 0 0 .75.433L10 13.5l6.25 3.433A.5.5 0 0 0 17 16.5V3.517c0-1.103-.806-2.068-1.93-2.207A41.054 41.054 0 0 0 10 1Z"
              clipRule="evenodd"
            />
          </svg>
        }
      />

      <StatCard
        label="Free Users"
        value={analytics.free_users}
        accentColor="#FFC0CB"
        description="On the free tier"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
          </svg>
        }
      />

      <StatCard
        label="Daily Active Users"
        value={analytics.dau}
        accentColor="#FCE883"
        description="Completed habits today"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M12.577 4.878a.75.75 0 0 1 .919-.53l4.78 1.281a.75.75 0 0 1 .531.919l-1.281 4.78a.75.75 0 0 1-1.449-.387l.81-3.022a19.407 19.407 0 0 0-5.594 5.203.75.75 0 0 1-1.139.093L7 10.06l-4.72 4.72a.75.75 0 0 1-1.06-1.061l5.25-5.25a.75.75 0 0 1 1.06 0l3.074 3.073a20.923 20.923 0 0 1 5.545-4.931l-3.042-.815a.75.75 0 0 1-.53-.918Z"
              clipRule="evenodd"
            />
          </svg>
        }
      />
    </div>
  )
}

export function AnalyticsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-gray-900 border border-gray-800 p-6 h-36 animate-pulse"
        />
      ))}
    </div>
  )
}
