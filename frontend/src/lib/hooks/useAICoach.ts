'use client'

import { useState, useCallback, useEffect } from 'react'
import { IChatMessage, ICalendarEvent } from '@/types/calendar'
import { useSSE } from './useSSE'

const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 1 week

interface StoredSession {
  conversationId: string | null
  messages: (Omit<IChatMessage, 'timestamp'> & { timestamp: string })[]
  savedAt: number
}

function loadSession(key: string): { conversationId: string | null; messages: IChatMessage[] } {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { conversationId: null, messages: [] }
    const session: StoredSession = JSON.parse(raw)
    if (Date.now() - session.savedAt > TTL_MS) {
      localStorage.removeItem(key)
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

function saveSession(key: string, conversationId: string | null, messages: IChatMessage[]) {
  try {
    const session: StoredSession = {
      conversationId,
      messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      savedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(session))
  } catch {
    // ignore storage errors
  }
}

export function useAICoach(userId?: string) {
  const storageKey = userId ? `aicoach_session_${userId}` : null

  const [messages, setMessages] = useState<IChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const { isStreaming, sendMessage, abort } = useSSE()

  // Load session when user is identified
  useEffect(() => {
    if (!storageKey) return
    const session = loadSession(storageKey)
    setMessages(session.messages)
    setConversationId(session.conversationId)
  }, [storageKey])

  // Save session when it changes
  useEffect(() => {
    if (!storageKey || messages.length === 0) return
    saveSession(storageKey, conversationId, messages)
  }, [storageKey, conversationId, messages])

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
    if (storageKey) localStorage.removeItem(storageKey)
  }, [storageKey])

  return { messages, isStreaming, send, abort, reset, conversationId }
}
