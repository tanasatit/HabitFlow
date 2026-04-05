'use client'

import { useState, useRef } from 'react'
import { ICalendarEvent, ISSEEvent } from '@/types/calendar'
import { API_BASE } from '@/lib/api'

interface UseSSEOptions {
  onToken: (text: string) => void
  onToolCall?: (data: string) => void
  onCalendarUpdate?: (events: ICalendarEvent[]) => void
  onDone: (data: string) => void
  onError: (error: string) => void
}

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = async (
    message: string,
    conversationId: string | null,
    options: UseSSEOptions
  ): Promise<void> => {
    abortRef.current = new AbortController()
    setIsStreaming(true)

    try {
      // SSE requires raw fetch (POST-based streaming); api.ts wrapper awaits full JSON response
      const resp = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, conversation_id: conversationId }),
        signal: abortRef.current.signal,
      })

      if (!resp.ok || !resp.body) {
        options.onError(`Request failed: ${resp.status}`)
        return
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false

      while (!finished) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)
          try {
            const event: ISSEEvent = JSON.parse(jsonStr)
            switch (event.type) {
              case 'token':
                options.onToken(event.data)
                break
              case 'tool_call':
                options.onToolCall?.(event.data)
                break
              case 'calendar_update': {
                const events: ICalendarEvent[] = JSON.parse(event.data)
                options.onCalendarUpdate?.(events)
                break
              }
              case 'done':
                options.onDone(event.data)
                finished = true
                break
              case 'error':
                options.onError(event.data)
                finished = true
                break
            }
          } catch {
            // skip malformed lines
          }
          if (finished) break
        }
      }
      reader.cancel()
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        options.onError(err.message)
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const abort = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  return { isStreaming, sendMessage, abort }
}
