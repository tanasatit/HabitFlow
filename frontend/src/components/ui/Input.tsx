'use client'

import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-300">{label}</label>
      <input
        className={`w-full px-4 py-3 rounded-lg bg-gray-800 text-white border ${
          error ? 'border-red-500' : 'border-gray-700'
        } focus:outline-none focus:border-[#FF6B6B] transition-colors placeholder:text-gray-500 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
