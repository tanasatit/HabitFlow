'use client'

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
  const { user } = useAuth()

  return (
    <nav className="flex flex-col gap-1 mt-4" aria-label="Main navigation">
      {NAV_LINKS.map((link) => (
        <a key={link.href} href={link.href} className={LINK_CLASS}>
          {link.icon}
          {link.label}
        </a>
      ))}

      {user?.role === 'admin' && (
        <a
          href={ADMIN_LINK.href}
          className={`${LINK_CLASS} mt-2 border-t border-gray-800 pt-3`}
        >
          {ADMIN_LINK.icon}
          {ADMIN_LINK.label}
        </a>
      )}
    </nav>
  )
}
