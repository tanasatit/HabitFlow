import { renderHook, act, waitFor } from '@testing-library/react'
import { useCalendar } from '../useCalendar'

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}))

import { api } from '@/lib/api'

const mockApi = api as jest.Mocked<typeof api>

const makeEvent = (overrides = {}) => ({
  id: 'e1',
  user_id: 'u1',
  habit_id: null,
  title: 'Morning Yoga',
  description: '',
  scheduled_date: '2026-04-11',
  start_time: '09:00',
  duration_minutes: 30,
  source: 'manual' as const,
  is_completed: false,
  color: '#FF8243',
  created_at: '2026-04-11T00:00:00Z',
  updated_at: '2026-04-11T00:00:00Z',
  ...overrides,
})

describe('useCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('fetchEvents loads events for a date range', async () => {
    const events = [makeEvent()]
    mockApi.get.mockResolvedValueOnce({ data: events })

    const { result } = renderHook(() => useCalendar())

    await act(async () => {
      await result.current.fetchEvents('2026-04-01', '2026-04-30')
    })

    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].title).toBe('Morning Yoga')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockApi.get).toHaveBeenCalledWith('/calendar?start=2026-04-01&end=2026-04-30')
  })

  test('fetchEvents sets error when API fails', async () => {
    mockApi.get.mockResolvedValueOnce({ error: 'Server error' })

    const { result } = renderHook(() => useCalendar())

    await act(async () => {
      await result.current.fetchEvents('2026-04-01', '2026-04-30')
    })

    expect(result.current.error).toBe('Server error')
    expect(result.current.events).toHaveLength(0)
  })

  test('createEvent appends event to list', async () => {
    const newEvent = makeEvent({ id: 'e2', title: 'Run' })
    mockApi.post.mockResolvedValueOnce({ data: newEvent })

    const { result } = renderHook(() => useCalendar())

    await act(async () => {
      const res = await result.current.createEvent({
        title: 'Run',
        scheduled_date: '2026-04-11',
        start_time: '07:00',
      })
      expect(res.error).toBeUndefined()
    })

    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].title).toBe('Run')
    expect(mockApi.post).toHaveBeenCalledWith('/calendar', expect.objectContaining({ title: 'Run' }))
  })

  test('createEvent returns error on failure', async () => {
    mockApi.post.mockResolvedValueOnce({ error: 'Limit reached' })

    const { result } = renderHook(() => useCalendar())

    let res: { error?: string } = {}
    await act(async () => {
      res = await result.current.createEvent({
        title: 'Run',
        scheduled_date: '2026-04-11',
        start_time: '07:00',
      })
    })

    expect(res.error).toBe('Limit reached')
    expect(result.current.events).toHaveLength(0)
  })

  test('deleteEvent removes event from list', async () => {
    const event = makeEvent()
    mockApi.get.mockResolvedValueOnce({ data: [event] })
    mockApi.delete.mockResolvedValueOnce({ data: {} })

    const { result } = renderHook(() => useCalendar())

    await act(async () => {
      await result.current.fetchEvents('2026-04-01', '2026-04-30')
    })

    expect(result.current.events).toHaveLength(1)

    await act(async () => {
      const res = await result.current.deleteEvent('e1')
      expect(res.error).toBeUndefined()
    })

    expect(result.current.events).toHaveLength(0)
    expect(mockApi.delete).toHaveBeenCalledWith('/calendar/e1')
  })

  test('updateEvent replaces event in list', async () => {
    const event = makeEvent()
    const updated = makeEvent({ title: 'Evening Yoga' })
    mockApi.get.mockResolvedValueOnce({ data: [event] })
    mockApi.patch.mockResolvedValueOnce({ data: updated })

    const { result } = renderHook(() => useCalendar())

    await act(async () => {
      await result.current.fetchEvents('2026-04-01', '2026-04-30')
    })

    await act(async () => {
      const res = await result.current.updateEvent('e1', { title: 'Evening Yoga' })
      expect(res.error).toBeUndefined()
    })

    expect(result.current.events[0].title).toBe('Evening Yoga')
    expect(mockApi.patch).toHaveBeenCalledWith('/calendar/e1', { title: 'Evening Yoga' })
  })

  test('addEventsLocally merges events without duplicates', async () => {
    const existing = makeEvent({ id: 'e1' })
    const newOne = makeEvent({ id: 'e2', title: 'Swim' })
    const replace = makeEvent({ id: 'e1', title: 'Updated Yoga' })

    const { result } = renderHook(() => useCalendar())

    act(() => {
      result.current.addEventsLocally([existing])
    })

    expect(result.current.events).toHaveLength(1)

    act(() => {
      result.current.addEventsLocally([replace, newOne])
    })

    await waitFor(() => expect(result.current.events).toHaveLength(2))
    const titles = result.current.events.map(e => e.title)
    expect(titles).toContain('Updated Yoga')
    expect(titles).toContain('Swim')
    expect(titles).not.toContain('Morning Yoga')
  })
})
