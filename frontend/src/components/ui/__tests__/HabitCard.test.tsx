import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HabitCard } from '../HabitCard'

// framer-motion doesn't work well in jsdom; mock it to render children directly
jest.mock('framer-motion', () => {
  const React = require('react')
  const motion = new Proxy({}, {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      return React.forwardRef(({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }, ref: React.Ref<HTMLElement>) => {
        return React.createElement(prop, { ...props, ref }, children)
      })
    },
  })
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

const makeHabit = (overrides = {}) => ({
  id: 'h1',
  user_id: 'u1',
  name: 'Meditate',
  category: 'mindfulness',
  frequency: 'daily' as const,
  target_time: 'morning' as const,
  description: '',
  is_active: true,
  points: 10,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  current_streak: 5,
  completed_today: false,
  ...overrides,
})

describe('HabitCard', () => {
  test('renders habit name', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        onToggleComplete={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText('Meditate')).toBeInTheDocument()
  })

  test('renders streak value via StreakBadge', () => {
    render(
      <HabitCard
        habit={makeHabit({ current_streak: 5 })}
        onToggleComplete={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/5/)).toBeInTheDocument()
  })

  test('clicking the toggle button calls onToggleComplete with habit id', async () => {
    const onToggleComplete = jest.fn().mockResolvedValue(undefined)
    render(
      <HabitCard
        habit={makeHabit()}
        onToggleComplete={onToggleComplete}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /mark as complete/i }))
    expect(onToggleComplete).toHaveBeenCalledWith('h1')
  })

  test('toggle button shows "mark as incomplete" when already completed today', () => {
    render(
      <HabitCard
        habit={makeHabit({ completed_today: true })}
        onToggleComplete={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /mark as incomplete/i })).toBeInTheDocument()
  })

  test('edit button calls onEdit with habit id', async () => {
    const onEdit = jest.fn()
    render(
      <HabitCard
        habit={makeHabit()}
        onToggleComplete={jest.fn()}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /edit meditate/i }))
    expect(onEdit).toHaveBeenCalledWith('h1')
  })

  test('delete button calls onDelete with habit id', async () => {
    const onDelete = jest.fn()
    render(
      <HabitCard
        habit={makeHabit()}
        onToggleComplete={jest.fn()}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /delete meditate/i }))
    expect(onDelete).toHaveBeenCalledWith('h1')
  })
})
