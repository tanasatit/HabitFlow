'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ICreateHabitInput } from '@/types/habit'

interface HabitCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
  /** Called with the new habit payload; must return { error?: string } */
  onCreate: (input: ICreateHabitInput) => Promise<{ error?: string }>
}

export function HabitCreateForm({ onSuccess, onCancel, onCreate }: HabitCreateFormProps) {
  const [form, setForm] = useState<ICreateHabitInput>({
    name: '',
    category: '',
    frequency: 'daily',
    target_time: 'anytime',
    description: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ICreateHabitInput, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isFreeTierHit, setIsFreeTierHit] = useState(false)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: Partial<Record<keyof ICreateHabitInput, string>> = {}
    if (!form.name.trim()) {
      newErrors.name = 'Habit name is required'
    } else if (form.name.trim().length > 100) {
      newErrors.name = 'Name must be 100 characters or fewer'
    }
    if (form.description && form.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or fewer'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setIsFreeTierHit(false)

    if (!validate()) return

    setLoading(true)
    const result = await onCreate({
      name: form.name.trim(),
      category: form.category || undefined,
      frequency: form.frequency || undefined,
      target_time: form.target_time || undefined,
      description: form.description || undefined,
    })
    setLoading(false)

    if (result.error) {
      if (result.error.toLowerCase().includes('free tier')) {
        setIsFreeTierHit(true)
      } else {
        setSubmitError(result.error)
      }
      return
    }

    onSuccess()
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof ICreateHabitInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg mx-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-habit-title"
    >
      <h2 id="create-habit-title" className="text-xl font-bold text-white mb-6">
        Create a new habit
      </h2>

      {/* Free tier upgrade prompt */}
      {isFreeTierHit && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl border border-[#FF8243]/30 bg-gradient-to-r from-[#FF8243]/10 to-[#FFC0CB]/10"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8243] to-[#FFC0CB] flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 text-white"
                aria-hidden="true"
              >
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.684-2.051a1 1 0 0 1 .632-.632l2.051-.684a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.632-.633L6.95 5.684Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">You&apos;ve reached the free limit</p>
              <p className="text-xs text-gray-400 mt-1">
                Free accounts can track up to 3 habits. Upgrade to Premium for unlimited habits,
                AI coaching, and more.
              </p>
              <button
                type="button"
                className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#FF8243] to-[#FFC0CB] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {submitError && !isFreeTierHit && (
        <p className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {submitError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Habit name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Morning run"
          required
          maxLength={100}
          error={errors.name}
          autoFocus
        />

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm text-gray-300">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={form.category ?? ''}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-[#FF8243] transition-colors cursor-pointer"
          >
            <option value="">No category</option>
            <option value="health">Health</option>
            <option value="learning">Learning</option>
            <option value="productivity">Productivity</option>
            <option value="mindfulness">Mindfulness</option>
          </select>
        </div>

        {/* Frequency */}
        <div className="flex flex-col gap-1">
          <label htmlFor="frequency" className="text-sm text-gray-300">
            Frequency
          </label>
          <select
            id="frequency"
            name="frequency"
            value={form.frequency ?? 'daily'}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-[#FF8243] transition-colors cursor-pointer"
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Target time */}
        <div className="flex flex-col gap-1">
          <label htmlFor="target_time" className="text-sm text-gray-300">
            Target time
          </label>
          <select
            id="target_time"
            name="target_time"
            value={form.target_time ?? 'anytime'}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-[#FF8243] transition-colors cursor-pointer"
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="anytime">Anytime</option>
          </select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm text-gray-300">
            Description{' '}
            <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description ?? ''}
            onChange={handleChange}
            placeholder="Add a note about this habit..."
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-[#FF8243] transition-colors placeholder:text-gray-500 resize-none"
          />
          {errors.description && (
            <p className="text-xs text-red-400">{errors.description}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            Create habit
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
