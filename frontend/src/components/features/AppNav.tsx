'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

// SettingsNavItem is a no-op: settings/logout moved to UserAvatarMenu

interface NavLink {
  href: string
  label: string
  icon: string
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/habits', label: 'Habits', icon: 'checklist' },
  { href: '/ai-coach', label: 'AI Coach', icon: 'auto_awesome' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar_month' },
]

export function AppNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <nav className="flex flex-col gap-1 flex-1 overflow-y-auto" aria-label="Main navigation">
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`mx-6 py-3 px-6 flex items-center gap-4 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? 'bg-primary text-white'
                : 'text-on-background/60 hover:bg-surface-variant'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px] flex-shrink-0"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              aria-hidden="true"
            >
              {link.icon}
            </span>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        )
      })}

      {user?.role === 'admin' && (
        <Link
          href="/admin/users"
          aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
          className={`mx-6 py-3 px-6 flex items-center gap-4 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary mt-2 ${
            pathname.startsWith('/admin')
              ? 'bg-primary text-white'
              : 'text-on-background/60 hover:bg-surface-variant'
          }`}
        >
          <span
            className="material-symbols-outlined text-[20px] flex-shrink-0"
            style={{ fontVariationSettings: pathname.startsWith('/admin') ? "'FILL' 1" : "'FILL' 0" }}
            aria-hidden="true"
          >
            admin_panel_settings
          </span>
          <span className="text-sm font-medium">Admin Panel</span>
        </Link>
      )}
    </nav>
  )
}

// SettingsNavItem kept as a no-op for backward compatibility.
// Settings and Logout are now handled by UserAvatarMenu.
export function SettingsNavItem() {
  return null
}
