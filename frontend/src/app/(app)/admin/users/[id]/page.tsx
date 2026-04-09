'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAdminUser } from '@/lib/hooks/useAdmin'
import type { IUpdateUserInput } from '@/types/admin'

const ROLE_OPTIONS: Array<{ value: IUpdateUserInput['role']; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
  { value: 'admin', label: 'Admin' },
]

function FieldSkeleton() {
  return (
    <div className="h-11 rounded-lg bg-surface-variant animate-pulse" aria-hidden="true" />
  )
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { user, loading, error, refetch, updateUser } = useAdminUser(id)

  const [nameValue, setNameValue] = useState<string>('')
  const [roleValue, setRoleValue] = useState<IUpdateUserInput['role']>('free')
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize form once user loads
  if (user && !initialized) {
    setNameValue(user.name ?? '')
    setRoleValue(user.role)
    setInitialized(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const input: IUpdateUserInput = {}
    if (nameValue !== user.name) input.name = nameValue
    if (roleValue !== user.role) input.role = roleValue

    const updated = await updateUser(input)
    if (updated) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setSaveError('Failed to save changes. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-6">
      {/* Back link */}
      <a
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-background transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] rounded"
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
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clipRule="evenodd"
          />
        </svg>
        Back to Users
      </a>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-on-background">User Detail</h1>
        {user && (
          <p className="text-sm text-on-surface-variant mt-1">
            {user.email} &mdash; ID: <span className="font-mono text-xs">{user.id}</span>
          </p>
        )}
      </motion.div>

      {/* Error / retry */}
      {error && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-50 border border-red-300 text-sm text-red-600"
          role="alert"
        >
          <span>{error}</span>
          <button
            onClick={refetch}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Edit form */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-outline rounded-2xl p-6 space-y-6"
        aria-label="Edit user form"
      >
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-name" className="text-sm text-on-background font-medium">
            Name
          </label>
          {loading ? (
            <FieldSkeleton />
          ) : (
            <input
              id="user-name"
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-background text-on-background border border-outline focus:outline-none focus:border-primary transition-colors text-sm placeholder:text-on-surface-variant"
              placeholder="User's full name"
              minLength={1}
              maxLength={100}
            />
          )}
        </div>

        {/* Email (read-only) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-on-background font-medium">Email</span>
          {loading ? (
            <FieldSkeleton />
          ) : (
            <p className="px-4 py-2.5 rounded-lg bg-surface-variant border border-outline text-on-surface-variant text-sm">
              {user?.email}
            </p>
          )}
        </div>

        {/* Role */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-role" className="text-sm text-on-background font-medium">
            Role
          </label>
          {loading ? (
            <FieldSkeleton />
          ) : (
            <select
              id="user-role"
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value as IUpdateUserInput['role'])}
              className="w-full px-4 py-2.5 rounded-lg bg-background text-on-background border border-outline focus:outline-none focus:border-primary transition-colors text-sm cursor-pointer"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-on-surface-variant">
            Changing role to premium/admin will also upgrade the subscription plan.
          </p>
        </div>

        {/* Subscription (read-only info) */}
        {user?.subscription && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-on-background font-medium">Subscription</span>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-surface-variant border border-outline text-sm">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Plan</p>
                <p className="text-on-background capitalize font-medium">{user.subscription.plan}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Expires</p>
                <p className="text-on-background">
                  {user.subscription.expires_at
                    ? new Date(user.subscription.expires_at).toLocaleDateString()
                    : 'No expiry'}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                  Sub created
                </p>
                <p className="text-on-background">
                  {new Date(user.subscription.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                  User joined
                </p>
                <p className="text-on-background">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-300 rounded-lg px-4 py-3" role="alert">
            {saveError}
          </p>
        )}

        {/* Success message */}
        {saveSuccess && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-tertiary bg-tertiary/10 border border-tertiary/30 rounded-lg px-4 py-3"
            role="status"
          >
            Changes saved successfully.
          </motion.p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || loading}
          className="w-full py-3 px-6 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8243] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #FF8243, #FFC0CB)' }}
        >
          {saving && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
