'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

export function UpgradePromo() {
  const { user } = useAuth()
  const isPremium = user?.role === 'premium' || user?.role === 'admin'

  if (isPremium) return null

  return (
    <div className="bg-secondary/20 border border-secondary/30 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
          workspace_premium
        </span>
        <p className="text-sm font-semibold text-on-background">Go Premium</p>
      </div>
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Unlock AI Coach, Calendar Sync, and unlimited habits.
      </p>
      <Link
        href="/settings"
        className="block w-full text-center px-4 py-2 rounded-full text-xs font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ background: 'linear-gradient(135deg, #FF8243, #FFC0CB)' }}
      >
        Unlock All Features
      </Link>
    </div>
  )
}
