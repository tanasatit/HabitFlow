'use client'

import Link from 'next/link'

interface Props {
  feature: string
}

export function UpgradePrompt({ feature }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-8">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Premium</h2>
        <p className="text-gray-500 max-w-sm">
          Unlock {feature} and other premium features to supercharge your habit building journey.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="px-8 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
      >
        Upgrade Now
      </Link>
    </div>
  )
}
