'use client'

import { useState, KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-outline px-4 py-3 bg-background">
      <div className="bg-surface border border-outline rounded-2xl flex items-center gap-2 px-4 py-2">
        {/* Mic placeholder — no functionality */}
        <span className="material-symbols-outlined text-on-background/30 text-[20px] flex-shrink-0" aria-hidden="true">mic</span>

        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Describe your week or ask for a habit plan..."
          rows={1}
          className="flex-1 bg-transparent outline-none text-sm font-sans text-on-background placeholder-on-surface-variant resize-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed py-1.5"
        />

        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 bg-primary text-white font-headline font-bold uppercase tracking-widest text-xs px-6 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
      <p className="text-xs text-on-surface-variant mt-2 px-1">Enter to send &middot; Shift+Enter for new line</p>
    </div>
  )
}
