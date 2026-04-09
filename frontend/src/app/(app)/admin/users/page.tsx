'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAdminUsers } from '@/lib/hooks/useAdmin'
import { useAuth } from '@/lib/hooks/useAuth'
import { UserTable } from '@/components/features/admin/UserTable'

function TableSkeleton() {
  return (
    <div className="bg-surface border border-outline rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="bg-surface-variant border-b border-outline px-4 py-3 flex gap-4">
        {[120, 180, 80, 80, 80, 100].map((w, i) => (
          <div key={i} className="h-3 rounded bg-outline animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-surface border-b border-outline last:border-b-0 px-4 py-4">
          <div className="flex gap-4 items-center">
            {[120, 180, 80, 80, 80, 100].map((w, j) => (
              <div
                key={j}
                className="h-3 rounded bg-outline animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const {
    users,
    total,
    page,
    setPage,
    limit,
    search,
    setSearch,
    loading,
    error,
    refetch,
    deleteUser,
  } = useAdminUsers()

  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Debounce search
  const [searchInput, setSearchInput] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSearch(value)
        setPage(1)
      }, 400)
    },
    [setSearch, setPage],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/admin/users/${id}`)
    },
    [router],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteError(null)
      const err = await deleteUser(id)
      if (err) setDeleteError(err)
    },
    [deleteUser],
  )

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="p-6 md:p-8 space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-headline font-bold text-2xl text-on-background">Users</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {loading ? 'Loading...' : `${total.toLocaleString()} total users`}
        </p>
      </motion.header>

      {/* Search + actions bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-outline text-on-background text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            aria-label="Search users"
          />
        </div>
      </div>

      {/* Error states */}
      {(error || deleteError) && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          role="alert"
        >
          <span>{error ?? deleteError}</span>
          {error && (
            <button
              onClick={refetch}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <UserTable users={users} currentUserId={currentUser?.id} onEdit={handleEdit} onDelete={handleDelete} />
        </motion.div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-surface border border-outline hover:bg-surface-variant text-on-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-sm text-on-surface-variant">
            Page <span className="text-on-background font-bold">{page}</span> of{' '}
            <span className="text-on-background font-bold">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-surface border border-outline hover:bg-surface-variant text-on-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
