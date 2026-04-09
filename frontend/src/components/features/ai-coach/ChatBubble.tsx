'use client'

import { motion } from 'framer-motion'
import { IChatMessage } from '@/types/calendar'
import { CalendarPreviewCard } from './CalendarPreviewCard'
import { useAuth } from '@/lib/hooks/useAuth'

interface Props {
  message: IChatMessage
  isStreaming?: boolean
}

export function ChatBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const { user } = useAuth()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3 mb-4`}
    >
      {/* Avatar */}
      {!isUser ? (
        <div className="w-10 h-10 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">smart_toy</span>
        </div>
      ) : (
        <div className="flex-shrink-0">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline font-bold text-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col max-w-[75%]">
        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap p-4 ${
            isUser
              ? 'bg-primary text-white rounded-2xl rounded-tr-none'
              : 'bg-surface border border-outline text-on-background rounded-2xl rounded-tl-none'
          }`}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-tertiary/40 ml-1 animate-pulse align-middle" />
          )}
        </div>
        {message.calendarEvents && message.calendarEvents.length > 0 && (
          <div className="mt-2">
            <CalendarPreviewCard events={message.calendarEvents} />
          </div>
        )}
        <p className={`text-xs text-on-surface-variant mt-1 px-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}
