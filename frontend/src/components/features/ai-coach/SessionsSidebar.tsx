'use client'

import { useEffect, useState, useCallback } from 'react'

const TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000

function storageKey(userId: string): string {
  return `habitflow_chat_sessions_${userId}`
}

interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatSession {
  id: string
  title: string
  messages: StoredMessage[]
  conversationId: string | null
  createdAt: number
}

function loadSessions(userId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const all: ChatSession[] = JSON.parse(raw)
    const cutoff = Date.now() - TTL_7_DAYS
    return all.filter((s) => s.createdAt >= cutoff && s.messages.length > 0)
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[], userId: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function sessionTitle(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === 'user')
  if (firstUser?.content) {
    return firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '…' : '')
  }
  return 'New Session'
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  className?: string
  userId: string
  activeSessionId?: string | null
  currentMessages?: StoredMessage[]
  currentConversationId?: string | null
  onSelectSession?: (messages: StoredMessage[], conversationId: string | null, sessionId: string) => void
  onNewSession?: (newSessionId: string) => void
}

export function SessionsSidebar({
  className = '',
  userId,
  activeSessionId,
  currentMessages = [],
  currentConversationId = null,
  onSelectSession,
  onNewSession,
}: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const loaded = loadSessions(userId)
    setSessions(loaded)
  }, [userId])

  // Auto-save active session's live messages to localStorage whenever they change.
  // If the session isn't in the list yet (new session with first message), it gets created here.
  // Empty sessions are never saved — a session only appears in the list once it has messages.
  useEffect(() => {
    if (!activeSessionId || !mounted || currentMessages.length === 0) return
    setSessions(prev => {
      const exists = prev.some(s => s.id === activeSessionId)
      let updated: ChatSession[]
      if (exists) {
        updated = prev.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: currentMessages, conversationId: currentConversationId ?? s.conversationId }
            : s
        )
      } else {
        // First message in this session — add it to the top of the list
        updated = [{
          id: activeSessionId,
          title: 'New Session',
          messages: currentMessages,
          conversationId: currentConversationId,
          createdAt: Date.now(),
        }, ...prev]
      }
      saveSessions(updated, userId)
      return updated
    })
  }, [currentMessages, activeSessionId, currentConversationId, mounted, userId])

  const handleNewSession = useCallback(() => {
    // Only generate a new ID — do NOT add an empty session to the list.
    // The auto-save effect will add it once the first message arrives.
    const newId = generateId()
    onNewSession?.(newId)
  }, [onNewSession])

  const handleClearAll = useCallback(() => {
    setSessions([])
    saveSessions([], userId)
    const newId = generateId()
    onNewSession?.(newId)
  }, [onNewSession, userId])

  const handleSelectSession = useCallback(
    (session: ChatSession) => {
      onSelectSession?.(session.messages, session.conversationId ?? null, session.id)
    },
    [onSelectSession],
  )

  return (
    <div
      className={`w-80 bg-surface border-r border-outline flex flex-col h-full ${className}`}
      aria-label="Sessions sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
        <h2 className="font-headline font-bold text-on-background text-base">Sessions</h2>
        <div className="flex items-center gap-2">
          <span className="bg-secondary/20 text-primary rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
            7-day
          </span>
          {mounted && sessions.length > 0 && (
            <button
              onClick={handleClearAll}
              title="Clear all history"
              className="text-[10px] font-semibold text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {!mounted ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-surface-variant animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-8">
            No sessions yet. Start a conversation!
          </p>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId
            return (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'bg-primary/10 border-l-2 border-primary pl-3'
                    : 'bg-surface-variant hover:bg-outline/30'
                }`}
                aria-label={sessionTitle(session)}
              >
                <p
                  className={`text-sm font-semibold truncate ${
                    isActive ? 'text-primary' : 'text-on-background'
                  }`}
                >
                  {sessionTitle(session)}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {formatDate(session.createdAt)}
                </p>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-outline">
        <button
          onClick={handleNewSession}
          className="w-full border border-outline rounded-full px-4 py-2.5 text-sm font-semibold text-on-background hover:bg-surface-variant transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          New Session
        </button>
      </div>
    </div>
  )
}
