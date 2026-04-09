'use client'

import { useState, useEffect } from 'react'
import { useAICoach } from '@/lib/hooks/useAICoach'
import { useAuth } from '@/lib/hooks/useAuth'
import { ChatMessageList } from '@/components/features/ai-coach/ChatMessageList'
import { ChatInput } from '@/components/features/ai-coach/ChatInput'
import { SessionsSidebar } from '@/components/features/ai-coach/SessionsSidebar'
import { SuggestionChips } from '@/components/features/ai-coach/SuggestionChips'
import { TypingIndicator } from '@/components/features/ai-coach/TypingIndicator'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'
import { ChatSkeleton } from '@/components/ui/Skeleton'

export default function AICoachPage() {
  const { user } = useAuth()
  const { messages, isStreaming, send, abort } = useAICoach(user?.id ?? undefined)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Default to true while mounting so server renders the full UI (avoids hydration mismatch)
  const isPremium = mounted ? (user?.role === 'premium' || user?.role === 'admin') : true

  if (mounted && !isPremium) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] px-6 py-4">
        <div className="mb-4">
          <h1 className="text-3xl font-headline font-extrabold italic text-on-background">AI Coach</h1>
          <p className="text-sm text-on-surface-variant">Your personal habit planning assistant</p>
        </div>
        <UpgradePrompt feature="AI Coach" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
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
        <SessionsSidebar className="hidden lg:flex" />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Loading skeleton when no messages and streaming hasn't started */}
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

              {/* Suggestion chips when no messages */}
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
    </div>
  )
}
