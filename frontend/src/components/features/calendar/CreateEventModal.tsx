'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ICreateEventInput } from '@/types/calendar'
import { EVENT_COLORS } from '@/lib/eventColors'

interface Props {
  isOpen: boolean
  defaultDate: string
  onClose: () => void
  onCreated: () => void
  createEvent: (input: ICreateEventInput) => Promise<{ error?: string }>
}

export function CreateEventModal({ isOpen, defaultDate, onClose, onCreated, createEvent }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_date: defaultDate,
    start_time: '09:00',
    duration_minutes: 30,
    color: '#14b8a6',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sync defaultDate when modal opens on a new day
  const handleOpen = () => {
    setForm(prev => ({ ...prev, scheduled_date: defaultDate, color: '#14b8a6' }))
    setError(null)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'duration_minutes' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setLoading(true)
    setError(null)
    const result = await createEvent({
      title: form.title.trim(),
      description: form.description || undefined,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time,
      duration_minutes: form.duration_minutes,
      color: form.color,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setForm({ title: '', description: '', scheduled_date: defaultDate, start_time: '09:00', duration_minutes: 30, color: '#14b8a6' })
    onCreated()
    onClose()
  }

  return (
    <AnimatePresence onExitComplete={handleOpen}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-event-title"
          >
            <h2 id="create-event-title" className="text-lg font-bold text-gray-900 mb-5">
              Add Event
            </h2>

            {error && (
              <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Morning run"
                  maxLength={100}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    id="scheduled_date"
                    name="scheduled_date"
                    type="date"
                    value={form.scheduled_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Start time
                  </label>
                  <input
                    id="start_time"
                    name="start_time"
                    type="time"
                    value={form.start_time}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min={5}
                  max={480}
                  value={form.duration_minutes}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Add a note..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, color: c.value }))}
                      aria-label={c.label}
                      title={c.label}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                      style={{
                        backgroundColor: c.value,
                        boxShadow: form.color === c.value ? `0 0 0 2px white, 0 0 0 4px ${c.value}` : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add event'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
