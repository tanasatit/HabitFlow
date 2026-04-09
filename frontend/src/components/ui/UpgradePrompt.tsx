'use client'

import Link from 'next/link'

interface Props {
  feature: string
}

export function UpgradePrompt({ feature }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-[40px] text-primary" aria-hidden="true">
          workspace_premium
        </span>
      </div>
      <div className="text-center">
        <h2 className="font-headline font-bold text-2xl text-on-background mb-2">
          Upgrade to Premium
        </h2>
        <p className="text-on-surface-variant max-w-sm text-sm">
          Unlock {feature} and other premium features to supercharge your habit building journey.
        </p>
      </div>
      <Link
        href="/settings"
        className="px-8 py-3 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ background: 'linear-gradient(135deg, #FF8243, #FFC0CB)' }}
      >
        Upgrade Now
      </Link>
    </div>
  )
}
