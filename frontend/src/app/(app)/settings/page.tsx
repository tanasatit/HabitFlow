'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { GoogleCalendarConnect } from '@/components/features/settings/GoogleCalendarConnect'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { GoogleSignInButton } from '@/components/features/auth/GoogleSignInButton'

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

      {/* Linked Accounts */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Linked Accounts</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {mounted && user ? (
            user.google_id ? (
              <div className="flex items-center gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#069494]/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#069494]/10 flex items-center justify-center flex-shrink-0">
                    {/* Google icon */}
                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Google</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#069494]/10 text-[#069494] text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Link your Google account to enable one-click sign-in.
                </p>
                <GoogleSignInButton label="Link Google Account" />
              </div>
            )
          ) : (
            <div className="h-14 flex items-center justify-center">
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
