import { renderHook, act, waitFor } from '@testing-library/react'
import { useHabits } from '../useHabits'

// useHabits uses api from @/lib/api which calls fetch internally.
// We mock the api module to isolate the hook.
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

import { api } from '@/lib/api'

const mockApi = api as jest.Mocked<typeof api>

const makeHabit = (overrides = {}) => ({
  id: '1',
  user_id: 'u1',
  name: 'Run',
  category: 'health',
  frequency: 'daily' as const,
  target_time: 'morning' as const,
  description: '',
  is_active: true,
  points: 10,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  current_streak: 3,
  completed_today: false,
  ...overrides,
})

describe('useHabits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('loads habits on mount', async () => {
    const habits = [makeHabit()]
    mockApi.get.mockResolvedValueOnce({ data: habits })

    const { result } = renderHook(() => useHabits())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.habits).toHaveLength(1)
    expect(result.current.habits[0].name).toBe('Run')
    expect(result.current.error).toBeNull()
  })

  test('sets error when fetch fails', async () => {
    mockApi.get.mockResolvedValueOnce({ error: 'Network error' })

    const { result } = renderHook(() => useHabits())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Network error')
    expect(result.current.habits).toHaveLength(0)
  })

  test('createHabit calls POST and refetches', async () => {
    const initial = [makeHabit()]
    const created = makeHabit({ id: '2', name: 'Read' })
    const after = [makeHabit(), created]

    mockApi.get.mockResolvedValueOnce({ data: initial })
    mockApi.post.mockResolvedValueOnce({ data: created })
    mockApi.get.mockResolvedValueOnce({ data: after })

    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      const res = await result.current.createHabit({ name: 'Read' })
      expect(res.error).toBeUndefined()
    })

    await waitFor(() => expect(result.current.habits).toHaveLength(2))
    expect(mockApi.post).toHaveBeenCalledWith('/habits', { name: 'Read' })
  })

  test('createHabit returns error on failure', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [] })
    mockApi.post.mockResolvedValueOnce({ error: 'Limit reached' })

    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { error?: string } = {}
    await act(async () => {
      res = await result.current.createHabit({ name: 'Read' })
    })

    expect(res.error).toBe('Limit reached')
  })

  test('updateHabit calls PUT and refetches', async () => {
    const initial = [makeHabit()]
    const updated = makeHabit({ name: 'Run Updated' })

    mockApi.get.mockResolvedValueOnce({ data: initial })
    mockApi.put.mockResolvedValueOnce({ data: updated })
    mockApi.get.mockResolvedValueOnce({ data: [updated] })

    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      const res = await result.current.updateHabit('1', { name: 'Run Updated' })
      expect(res.error).toBeUndefined()
    })

    expect(mockApi.put).toHaveBeenCalledWith('/habits/1', { name: 'Run Updated' })
  })

  test('deleteHabit calls DELETE and refetches', async () => {
    const initial = [makeHabit()]

    mockApi.get.mockResolvedValueOnce({ data: initial })
    mockApi.delete.mockResolvedValueOnce({ data: { message: 'deleted' } })
    mockApi.get.mockResolvedValueOnce({ data: [] })

    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      const res = await result.current.deleteHabit('1')
      expect(res.error).toBeUndefined()
    })

    await waitFor(() => expect(result.current.habits).toHaveLength(0))
    expect(mockApi.delete).toHaveBeenCalledWith('/habits/1')
  })

  test('logCompletion calls POST on log endpoint and refetches', async () => {
    const initial = [makeHabit()]
    const updatedHabit = makeHabit({ completed_today: true, current_streak: 4 })

    mockApi.get.mockResolvedValueOnce({ data: initial })
    mockApi.post.mockResolvedValueOnce({ data: { id: 'log1', habit_id: '1', user_id: 'u1', completed_at: '', notes: '', created_at: '' } })
    mockApi.get.mockResolvedValueOnce({ data: updatedHabit }) // single habit, not array

    const { result } = renderHook(() => useHabits())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      const res = await result.current.logCompletion('1')
      expect(res.error).toBeUndefined()
    })

    await waitFor(() => expect(result.current.habits[0].completed_today).toBe(true))
    expect(mockApi.post).toHaveBeenCalledWith('/habits/1/log', { notes: '' })
  })
})
