'use client'

import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-bold text-on-background mb-1">{label}</label>
      <input
        className={`w-full border rounded-xl px-4 py-3 text-sm bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/50 ${
          error ? 'border-red-400' : 'border-outline'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
