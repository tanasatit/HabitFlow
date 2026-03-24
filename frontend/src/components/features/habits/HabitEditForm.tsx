'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { IHabitWithStreak, IUpdateHabitInput } from '@/types/habit'

interface HabitEditFormProps {
  habit: IHabitWithStreak
  onSuccess: () => void
  onCancel: () => void
  /** Called with the patch payload; must return { error?: string } */
  onUpdate: (id: string, input: IUpdateHabitInput) => Promise<{ error?: string }>
}

export function HabitEditForm({ habit, onSuccess, onCancel, onUpdate }: HabitEditFormProps) {
  const [form, setForm] = useState<IUpdateHabitInput>({
    name: habit.name,
    category: habit.category,
    frequency: habit.frequency,
    target_time: habit.target_time,
    description: habit.description,
    is_active: habit.is_active,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof IUpdateHabitInput, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: Partial<Record<keyof IUpdateHabitInput, string>> = {}
    if (form.name !== undefined) {
      if (!form.name.trim()) {
        newErrors.name = 'Habit name is required'
      } else if (form.name.trim().length > 100) {
        newErrors.name = 'Name must be 100 characters or fewer'
      }
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

    if (!validate()) return

    setLoading(true)
    const result = await onUpdate(habit.id, {
      name: form.name?.trim(),
      category: form.category,
      frequency: form.frequency,
      target_time: form.target_time,
      description: form.description,
      is_active: form.is_active,
    })
    setLoading(false)

    if (result.error) {
      setSubmitError(result.error)
      return
    }

    onSuccess()
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name as keyof IUpdateHabitInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full"
      role="form"
      aria-label="Edit habit"
    >
      <h2 className="text-xl font-bold text-white mb-6">Edit habit</h2>

      {submitError && (
        <p className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
          {submitError}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Habit name"
          name="name"
          value={form.name ?? ''}
          onChange={handleChange}
          placeholder="e.g. Morning run"
          required
          maxLength={100}
          error={errors.name}
        />

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-category" className="text-sm text-gray-300">
            Category
          </label>
          <select
            id="edit-category"
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
          <label htmlFor="edit-frequency" className="text-sm text-gray-300">
            Frequency
          </label>
          <select
            id="edit-frequency"
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
          <label htmlFor="edit-target_time" className="text-sm text-gray-300">
            Target time
          </label>
          <select
            id="edit-target_time"
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
          <label htmlFor="edit-description" className="text-sm text-gray-300">
            Description{' '}
            <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <textarea
            id="edit-description"
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

        {/* Active toggle */}
        <div className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id="edit-is_active"
            name="is_active"
            checked={form.is_active ?? true}
            onChange={handleChange}
            className="w-4 h-4 rounded accent-[#FF8243] cursor-pointer"
          />
          <label htmlFor="edit-is_active" className="text-sm text-gray-300 cursor-pointer">
            Active habit
          </label>
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
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
