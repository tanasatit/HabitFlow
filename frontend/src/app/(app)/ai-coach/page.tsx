'use client'

import { useAICoach } from '@/lib/hooks/useAICoach'
import { useAuth } from '@/lib/hooks/useAuth'
import { ChatMessageList } from '@/components/features/ai-coach/ChatMessageList'
import { ChatInput } from '@/components/features/ai-coach/ChatInput'
import { UpgradePrompt } from '@/components/ui/UpgradePrompt'

export default function AICoachPage() {
  const { user } = useAuth()
  const { messages, isStreaming, send, abort } = useAICoach()

  const isPremium = user?.role === 'premium' || user?.role === 'admin'

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

      {!isPremium ? (
        <UpgradePrompt feature="AI Coach" />
      ) : (
        <>
          <ChatMessageList messages={messages} isStreaming={isStreaming} />
          <ChatInput onSend={send} disabled={isStreaming} />
        </>
      )}
    </div>
  )
}
