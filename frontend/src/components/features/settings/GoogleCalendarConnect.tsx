'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGoogleCalendar } from '@/lib/hooks/useGoogleCalendar'
import { API_BASE } from '@/lib/api'

// NEXT_PUBLIC_API_URL already includes /api/v1 (e.g. http://localhost:8080/api/v1).
// We derive the auth URL from the same API_BASE constant used everywhere else to
// keep things consistent and avoid duplication.
//
// Auth note: this is a direct browser navigation (anchor tag), not a fetch call.
// The backend reads the JWT from an httpOnly cookie. Browsers automatically attach
// cookies to same-origin navigation requests, so no Authorization header is needed.
// credentials: 'include' in api.ts confirms the cookie-based auth strategy.
const GOOGLE_AUTH_URL = `${API_BASE}/google/auth`

export function GoogleCalendarConnect() {
  const { connected, email, connectedAt, loading, error, disconnect } = useGoogleCalendar()
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  async function handleDisconnect() {
    setDisconnecting(true)
    setDisconnectError(null)
    const result = await disconnect()
    if (result.error) setDisconnectError(result.error)
    setDisconnecting(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-center min-h-[120px]">
        <div className="w-5 h-5 border-2 border-[#069494] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-sm text-red-500">Failed to load Google Calendar status: {error}</p>
      </div>
    )
  }

  if (connected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Google Calendar icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="1.5" />
                <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" />
                <path d="M8 4V6M16 4V6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 14h2v2H7z" fill="#4285F4" />
                <path d="M11 14h2v2h-2z" fill="#4285F4" />
                <path d="M15 14h2v2h-2z" fill="#4285F4" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">Google Calendar</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-xs font-medium text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
              </div>
              {email && (
                <p className="text-sm text-gray-500">{email}</p>
              )}
              {connectedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Connected {new Date(connectedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {disconnecting ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                Disconnecting...
              </span>
            ) : (
              'Disconnect'
            )}
          </button>
        </div>

        {disconnectError && (
          <p className="mt-3 text-sm text-red-500">{disconnectError}</p>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-gray-100 p-6"
    >
      <div className="flex items-start gap-3">
        {/* Google Calendar icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="1.5" />
            <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" />
            <path d="M8 4V6M16 4V6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 14h2v2H7z" fill="#4285F4" />
            <path d="M11 14h2v2h-2z" fill="#4285F4" />
            <path d="M15 14h2v2h-2z" fill="#4285F4" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 mb-0.5">Google Calendar</p>
          <p className="text-sm text-gray-500 mb-4">
            Connect your Google Calendar so the AI Coach can read your real schedule and add habit plans directly to your calendar.
          </p>

          <a
            href={GOOGLE_AUTH_URL}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
            style={{ backgroundColor: '#4285F4' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3367D6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4285F4')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Connect Google Calendar
          </a>
        </div>
      </div>
    </motion.div>
  )
}
