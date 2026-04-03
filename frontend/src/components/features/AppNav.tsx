'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

const NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M10.707 2.293a1 1 0 0 0-1.414 0l-7 7a1 1 0 0 0 1.414 1.414L4 10.414V17a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6.586l.293.293a1 1 0 0 0 1.414-1.414l-7-7Z" />
      </svg>
    ),
  },
  {
    href: '/habits',
    label: 'Habits',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.3 1.269l9.344-5.447a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
      </svg>
    ),
  },
  {
    href: '/ai-coach',
    label: 'AI Coach',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
]

const ADMIN_LINK = {
  href: '/admin/users',
  label: 'Admin Panel',
  icon: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 11.25a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036a.75.75 0 0 1 .728-.568ZM16.5 6a.75.75 0 0 1 .75.75 2.25 2.25 0 0 0 2.25 2.25.75.75 0 0 1 0 1.5 2.25 2.25 0 0 0-2.25 2.25.75.75 0 0 1-1.5 0 2.25 2.25 0 0 0-2.25-2.25.75.75 0 0 1 0-1.5 2.25 2.25 0 0 0 2.25-2.25A.75.75 0 0 1 16.5 6Z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

const LINK_CLASS =
  'flex items-center gap-3 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243]'

export function AppNav() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex flex-col gap-1 mt-4 flex-1" aria-label="Main navigation">
      {NAV_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={LINK_CLASS}>
          {link.icon}
          {link.label}
        </Link>
      ))}

      {user?.role === 'admin' && (
        <Link
          href={ADMIN_LINK.href}
          className={`${LINK_CLASS} mt-2 border-t border-gray-800 pt-3`}
        >
          {ADMIN_LINK.icon}
          {ADMIN_LINK.label}
        </Link>
      )}

      {user && (
        <div className="mt-auto pt-4 border-t border-gray-800">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-500">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className={`${LINK_CLASS} text-red-400 hover:text-red-300 w-full`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.007a.75.75 0 1 0-1.004-1.118l-2.5 2.25a.75.75 0 0 0 0 1.118l2.5 2.25a.75.75 0 1 0 1.004-1.118L8.704 10.75H18.25A.75.75 0 0 0 19 10Z"
                clipRule="evenodd"
              />
            </svg>
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}
