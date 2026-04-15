import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarEventCard } from '../CalendarEventCard'
import type { ICalendarEvent } from '@/types/calendar'

const makeEvent = (overrides: Partial<ICalendarEvent> = {}): ICalendarEvent => ({
  id: 'ev1',
  user_id: 'u1',
  habit_id: null,
  title: 'Team Standup',
  description: '',
  scheduled_date: '2026-04-11',
  start_time: '09:00',
  duration_minutes: 30,
  source: 'manual',
  is_completed: false,
  color: '',
  created_at: '2026-04-11T00:00:00Z',
  updated_at: '2026-04-11T00:00:00Z',
  ...overrides,
})

describe('CalendarEventCard', () => {
  test('renders event title', () => {
    render(<CalendarEventCard event={makeEvent()} />)
    expect(screen.getByText('Team Standup')).toBeInTheDocument()
  })

  test('renders start_time and duration', () => {
    render(<CalendarEventCard event={makeEvent()} />)
    expect(screen.getByText(/09:00/)).toBeInTheDocument()
    expect(screen.getByText(/30min/)).toBeInTheDocument()
  })

  test('applies bg-primary class for manual source', () => {
    const { container } = render(<CalendarEventCard event={makeEvent({ source: 'manual' })} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-primary')
  })

  test('applies bg-tertiary class for ai source', () => {
    const { container } = render(<CalendarEventCard event={makeEvent({ source: 'ai' })} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-tertiary')
  })

  test('applies bg-secondary class for google source', () => {
    const { container } = render(<CalendarEventCard event={makeEvent({ source: 'google' })} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('bg-secondary')
  })

  test('shows AI badge for ai source', () => {
    render(<CalendarEventCard event={makeEvent({ source: 'ai' })} />)
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  test('shows G badge for google source', () => {
    render(<CalendarEventCard event={makeEvent({ source: 'google' })} />)
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  test('clicking card fires onClick callback with event', async () => {
    const onClick = jest.fn()
    const event = makeEvent()
    render(<CalendarEventCard event={event} onClick={onClick} />)
    await userEvent.click(screen.getByText('Team Standup'))
    expect(onClick).toHaveBeenCalledWith(event)
  })

  test('delete button fires onDelete callback', async () => {
    const onDelete = jest.fn()
    const event = makeEvent()
    render(<CalendarEventCard event={event} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /delete event: team standup/i }))
    expect(onDelete).toHaveBeenCalled()
  })
})
