'use client'

import { useState, useCallback } from 'react'
import { IChatMessage, ICalendarEvent } from '@/types/calendar'
import { useSSE } from './useSSE'

export function useAICoach() {
  const [messages, setMessages] = useState<IChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { isStreaming, sendMessage, abort } = useSSE()

  const send = useCallback(async (message: string) => {
    const ts = Date.now()
    setMessages(prev => [
      ...prev,
      { id: `user-${ts}`, role: 'user', content: message, timestamp: new Date() },
      { id: `assistant-${ts}`, role: 'assistant', content: '', timestamp: new Date() },
    ])

    await sendMessage(message, conversationId, {
      onToken: (text) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + text }
          }
          return updated
        })
      },
      onCalendarUpdate: (events: ICalendarEvent[]) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, calendarEvents: events }
          }
          return updated
        })
      },
      onDone: (data) => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.conversation_id) setConversationId(parsed.conversation_id)
        } catch {
          // ignore
        }
      },
      onError: (error) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant' && last.content === '') {
            updated[updated.length - 1] = { ...last, content: `Error: ${error}` }
          }
          return updated
        })
      },
    })
  }, [conversationId, sendMessage])

  const reset = useCallback(() => {
    setMessages([])
    setConversationId(null)
  }, [])

  return { messages, isStreaming, send, abort, reset, conversationId }
}
