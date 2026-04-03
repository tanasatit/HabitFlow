export interface ICalendarEvent {
  id: string
  user_id: string
  habit_id: string | null
  title: string
  description: string
  scheduled_date: string
  start_time: string
  duration_minutes: number
  source: 'ai' | 'manual'
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ICreateEventInput {
  title: string
  habit_id?: string
  description?: string
  scheduled_date: string
  start_time: string
  duration_minutes?: number
}

export interface ISSEEvent {
  type: 'token' | 'tool_call' | 'calendar_update' | 'done' | 'error'
  data: string
}

export interface IChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  calendarEvents?: ICalendarEvent[]
}
