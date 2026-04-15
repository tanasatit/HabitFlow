'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAICoach } from '@/lib/hooks/useAICoach'
import { useAuth } from '@/lib/hooks/useAuth'
import { ChatMessageList } from '@/components/features/ai-coach/ChatMessageList'
import { ChatInput } from '@/components/features/ai-coach/ChatInput'
import { SessionsSidebar } from '@/components/features/ai-coach/SessionsSidebar'
import { SuggestionChips } from '@/components/features/ai-coach/SuggestionChips'
import { TypingIndicator } from '@/components/features/ai-coach/TypingIndicator'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { ChatSkeleton } from '@/components/ui/Skeleton'
import type { IChatMessage } from '@/types/calendar'

export default function AICoachPage() {
  const { user } = useAuth()
  const { messages, isStreaming, send, abort, reset, loadMessages, conversationId } = useAICoach(user?.id ?? undefined)
  const [mounted, setMounted] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    setMounted(true)
    // On mount: restore the most recent session for THIS user from localStorage.
    // Keyed by user ID so different users don't share chat history.
    try {
      const raw = localStorage.getItem(`habitflow_chat_sessions_${user.id}`)
      if (raw) {
        const all = JSON.parse(raw) as Array<{
          id: string
          messages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[]
          conversationId: string | null
          createdAt: number
        }>
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        const valid = all.filter(s => s.createdAt >= cutoff && s.messages.length > 0)
        if (valid.length > 0) {
          const latest = valid[0]
          setActiveSessionId(latest.id)
          loadMessages(
            latest.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
            latest.conversationId ?? null,
          )
          return
        }
      }
    } catch { /* ignore */ }
    // No existing sessions — start with a fresh ID
    setActiveSessionId(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // Re-run when user changes (e.g. logout → login as different user)

  // When the user changes (different user logs in), clear in-memory chat.
  // useRef tracks the PREVIOUS id so we don't reset on the initial load.
  const prevUserIdRef = React.useRef<string | undefined>(undefined)
  useEffect(() => {
    const prevId = prevUserIdRef.current
    prevUserIdRef.current = user?.id
    if (prevId !== undefined && prevId !== user?.id) {
      reset()
      setActiveSessionId(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Default to true while mounting so server renders the full UI (avoids hydration mismatch)
  const isPremium = mounted ? (user?.role === 'premium' || user?.role === 'admin') : true

  const handleNewSession = useCallback((newSessionId: string) => {
    reset()
    setActiveSessionId(newSessionId)
  }, [reset])

  const handleSelectSession = useCallback((storedMessages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[], convId: string | null, sessionId: string) => {
    setActiveSessionId(sessionId)
    const restored: IChatMessage[] = storedMessages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
    loadMessages(restored, convId)
  }, [loadMessages])

  // Convert messages for sidebar (StoredMessage format)
  const sidebarMessages = messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: m.timestamp.toISOString(),
  }))

  return (
    <div suppressHydrationWarning className="flex flex-col h-[calc(100vh-4rem)]">
      {mounted && !isPremium ? (
        <div className="px-6 py-4">
          <div className="mb-4">
            <h1 className="text-3xl font-headline font-extrabold italic text-on-background">AI Coach</h1>
            <p className="text-sm text-on-surface-variant">Your personal habit planning assistant</p>
          </div>
          <UpgradePrompt feature="AI Coach" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline bg-background">
            <div>
              <h1 className="text-3xl font-headline font-extrabold italic text-on-background">AI Coach</h1>
              <p className="text-sm text-on-surface-variant">Your personal habit planning assistant</p>
            </div>
            {isStreaming && (
              <button
                onClick={abort}
                className="text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Stop
              </button>
            )}
          </div>

          {/* Split layout */}
          <div className="flex flex-1 overflow-hidden">
            <SessionsSidebar
              className="hidden lg:flex"
              userId={user?.id ?? ''}
              activeSessionId={activeSessionId}
              currentMessages={sidebarMessages}
              currentConversationId={conversationId}
              onNewSession={handleNewSession}
              onSelectSession={handleSelectSession}
            />

            <main className="flex-1 flex flex-col overflow-hidden">
              {!mounted ? (
                <ChatSkeleton />
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto">
                    <ChatMessageList messages={messages} isStreaming={isStreaming} />
                    {isStreaming && messages.length === 0 && (
                      <div className="px-4">
                        <TypingIndicator />
                      </div>
                    )}
                  </div>

                  {messages.length === 0 && !isStreaming && (
                    <div className="pb-2">
                      <SuggestionChips onSelect={(suggestion) => send(suggestion)} />
                    </div>
                  )}

                  <ChatInput onSend={send} disabled={isStreaming} />
                </>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  )
}
