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
  admin: 'bg-[#FF8243]/20 text-[#FF8243] border border-[#FF8243]/30',
  premium: 'bg-[#069494]/20 text-[#069494] border border-[#069494]/30',
  free: 'bg-gray-700 text-gray-300 border border-gray-600',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 id="delete-dialog-title" className="text-base font-semibold text-white mb-2">
          Delete user?
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          <span className="text-white font-medium">{name}</span> will be soft-deleted and can be
          restored from the database. This action cannot be undone from the UI.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
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

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm text-left" role="table">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Plan
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Joined
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((user) => (
              <tr
                key={user.id}
                className="bg-gray-900 hover:bg-gray-800/60 transition-colors"
              >
                <td className="px-4 py-3 text-gray-200 font-medium whitespace-nowrap">
                  {user.name || '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{user.email}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap capitalize">
                  {user.subscription?.plan ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(user.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243]"
                      aria-label={`Edit ${user.name || user.email}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setPendingDelete(user)}
                      disabled={user.id === currentUserId}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-900/40 disabled:hover:text-red-400"
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
