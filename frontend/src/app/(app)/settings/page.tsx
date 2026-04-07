'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { GoogleCalendarConnect } from '@/components/features/settings/GoogleCalendarConnect'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'

function SettingsContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [googleSuccess, setGoogleSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (searchParams.get('google') === 'connected') {
      setGoogleSuccess(true)
    }
  }, [searchParams])

  // Default to true while mounting so server renders the full UI (avoids hydration mismatch)
  const isPremium = mounted ? (user?.role === 'premium' || user?.role === 'admin') : true

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your account and integrations</p>

      {/* Account Info */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Account</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          {mounted && user ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900 font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span
                  className={`font-semibold capitalize ${
                    user.role === 'free' ? 'text-gray-400' : 'text-[#069494]'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            </>
          ) : (
            <div className="h-20 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#069494] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </section>

      {/* Integrations */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Integrations</h2>

        {/* Success banner after OAuth redirect */}
        {googleSuccess && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Google Calendar connected successfully!
          </div>
        )}

        {!isPremium ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <UpgradePrompt feature="Google Calendar Sync" />
          </div>
        ) : (
          <GoogleCalendarConnect />
        )}
      </section>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-6 py-8 flex items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 border-2 border-[#069494] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
