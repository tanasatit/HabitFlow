'use client'

import { useEffect, useState, useCallback } from 'react'

const SESSIONS_STORAGE_KEY = 'habitflow_chat_sessions'
const TTL_7_DAYS = 7 * 24 * 60 * 60 * 1000

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

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (!raw) return []
    const all: ChatSession[] = JSON.parse(raw)
    const cutoff = Date.now() - TTL_7_DAYS
    return all.filter((s) => s.createdAt >= cutoff)
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
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
  activeSessionId?: string | null
  currentMessages?: StoredMessage[]
  currentConversationId?: string | null
  onSelectSession?: (messages: StoredMessage[], conversationId: string | null) => void
  onNewSession?: (newSessionId: string) => void
}

export function SessionsSidebar({
  className = '',
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
    const loaded = loadSessions()
    setSessions(loaded)
  }, [])

  const handleNewSession = useCallback(() => {
    // Save current session if it has messages
    if (currentMessages.length > 0) {
      setSessions(prev => {
        const currentSession: ChatSession = {
          id: activeSessionId ?? generateId(),
          title: 'New Session',
          messages: currentMessages,
          conversationId: currentConversationId,
          createdAt: Date.now(),
        }
        const withoutCurrent = prev.filter(s => s.id !== activeSessionId)
        const updated = [currentSession, ...withoutCurrent]
        saveSessions(updated)
        return updated
      })
    }
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Session',
      messages: [],
      conversationId: null,
      createdAt: Date.now(),
    }
    setSessions(prev => {
      const updated = [newSession, ...prev]
      saveSessions(updated)
      return updated
    })
    onNewSession?.(newSession.id)
  }, [currentMessages, currentConversationId, activeSessionId, onNewSession])

  const handleSelectSession = useCallback(
    (session: ChatSession) => {
      onSelectSession?.(session.messages, session.conversationId ?? null)
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
        <span className="bg-secondary/20 text-primary rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
          7-day history
        </span>
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
