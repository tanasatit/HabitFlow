'use client'

import { useState, useEffect } from 'react'
import { useAICoach } from '@/lib/hooks/useAICoach'
import { useAuth } from '@/lib/hooks/useAuth'
import { ChatMessageList } from '@/components/features/ai-coach/ChatMessageList'
import { ChatInput } from '@/components/features/ai-coach/ChatInput'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'

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
          <h1 className="text-xl font-bold text-gray-900">AI Coach</h1>
          <p className="text-sm text-gray-500">Your personal habit planning assistant</p>
        </div>
        <UpgradePrompt feature="AI Coach" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Coach</h1>
          <p className="text-sm text-gray-500">Your personal habit planning assistant</p>
        </div>
        {isStreaming && (
          <button
            onClick={abort}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Stop
          </button>
        )}
      </div>

      <ChatMessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput onSend={send} disabled={isStreaming} />
    </div>
  )
}
