'use client'

import { motion } from 'framer-motion'
import { IChatMessage } from '@/types/calendar'
import { CalendarPreviewCard } from './CalendarPreviewCard'

interface Props {
  message: IChatMessage
  isStreaming?: boolean
}

export function ChatBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-teal-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-800 rounded-tl-sm'
          }`}
        >
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-gray-400 ml-1 animate-pulse align-middle" />
          )}
        </div>
        {message.calendarEvents && message.calendarEvents.length > 0 && (
          <div className="mt-2">
            <CalendarPreviewCard events={message.calendarEvents} />
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  )
}
