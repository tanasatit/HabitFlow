'use client'

import { useState } from 'react'
import type { IUserDetail } from '@/types/admin'

interface UserTableProps {
  users: IUserDetail[]
  currentUserId?: string
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-primary/20 text-primary border border-primary/30',
  premium: 'bg-tertiary/20 text-tertiary border border-tertiary/30',
  free: 'bg-surface-variant text-on-surface-variant border border-outline',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[role] ?? ROLE_BADGE.free}`}
    >
      {role}
    </span>
  )
}

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="bg-surface border border-outline rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 id="delete-dialog-title" className="text-base font-semibold text-on-background mb-2">
          Delete user?
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          <span className="text-on-background font-medium">{name}</span> will be soft-deleted and can be
          restored from the database. This action cannot be undone from the UI.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg bg-surface-variant hover:bg-outline text-on-background text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export function UserTable({ users, currentUserId, onEdit, onDelete }: UserTableProps) {
  const [pendingDelete, setPendingDelete] = useState<IUserDetail | null>(null)

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-on-surface-variant text-sm">
        No users found.
      </div>
    )
  }

  return (
    <>
      {pendingDelete && (
        <DeleteConfirm
          name={pendingDelete.name || pendingDelete.email}
          onConfirm={() => {
            onDelete(pendingDelete.id)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-outline">
        <table className="w-full text-sm text-left" role="table">
          <thead>
            <tr className="border-b border-outline bg-surface-variant">
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Plan
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Joined
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant text-right"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline">
            {users.map((user) => (
              <tr
                key={user.id}
                className="bg-surface hover:bg-surface-variant transition-colors"
              >
                <td className="px-4 py-3 text-on-background font-medium whitespace-nowrap">
                  {user.name || '—'}
                </td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{user.email}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap capitalize">
                  {user.subscription?.plan ?? '—'}
                </td>
                <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-variant hover:bg-outline text-on-background transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Edit ${user.name || user.email}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setPendingDelete(user)}
                      disabled={user.id === currentUserId}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-100 disabled:hover:text-red-600"
                      aria-label={`Delete ${user.name || user.email}`}
                      title={user.id === currentUserId ? 'Cannot delete your own account' : undefined}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
