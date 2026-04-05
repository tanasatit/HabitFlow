'use client'

import { useState, useCallback, useEffect } from 'react'
import { IChatMessage, ICalendarEvent } from '@/types/calendar'
import { useSSE } from './useSSE'

const STORAGE_KEY = 'aicoach_session'
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

interface StoredSession {
  conversationId: string | null
  messages: (Omit<IChatMessage, 'timestamp'> & { timestamp: string })[]
  savedAt: number
}

function loadSession(): { conversationId: string | null; messages: IChatMessage[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { conversationId: null, messages: [] }
    const session: StoredSession = JSON.parse(raw)
    if (Date.now() - session.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return { conversationId: null, messages: [] }
    }
    return {
      conversationId: session.conversationId,
      messages: session.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
    }
  } catch {
    return { conversationId: null, messages: [] }
  }
}

function saveSession(conversationId: string | null, messages: IChatMessage[]) {
  try {
    const session: StoredSession = {
      conversationId,
      messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ignore storage errors
  }
}

export function useAICoach() {
  const initial = loadSession()
  const [messages, setMessages] = useState<IChatMessage[]>(initial.messages)
  const [conversationId, setConversationId] = useState<string | null>(initial.conversationId)
  const { isStreaming, sendMessage, abort } = useSSE()

  useEffect(() => {
    saveSession(conversationId, messages)
  }, [conversationId, messages])

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
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { messages, isStreaming, send, abort, reset, conversationId }
}
