'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/habits', label: 'Habits', icon: 'checklist' },
  { href: '/ai-coach', label: 'AI Coach', icon: 'auto_awesome' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar_month' },
]

interface MobileBottomNavProps {
  className?: string
}

export function MobileBottomNav({ className = '' }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-outline flex items-center justify-around px-2 py-2 ${className}`}
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
