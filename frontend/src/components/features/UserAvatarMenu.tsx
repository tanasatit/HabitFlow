'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

function TierBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
        Admin
      </span>
    )
  }
  if (role === 'premium') {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        Premium
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
      Free
    </span>
  )
}

export function UserAvatarMenu() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleLogout() {
    setOpen(false)
    await logout()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div ref={containerRef} className="relative px-4 pb-4">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-variant transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="User menu"
        aria-expanded={open}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline font-bold text-sm">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          )}
        </div>

        {/* Name + badge */}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-headline font-bold text-sm text-on-background truncate">
            {user.name}
          </p>
          <TierBadge role={user.role} />
        </div>

        {/* Chevron */}
        <span
          className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_less
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-outline rounded-2xl shadow-lg overflow-hidden z-50 mx-4">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-on-background hover:bg-surface-variant transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
              settings
            </span>
            Settings
          </Link>
          <div className="border-t border-outline" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-background hover:bg-surface-variant transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">
              logout
            </span>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
