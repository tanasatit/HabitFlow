'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { AdminSidebar } from '@/components/features/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950" aria-live="polite">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF8243] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    // Will redirect via useEffect; show nothing while redirecting
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
