'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function PremiumLockModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.18 }}
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-lock-title"
          >
            <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-7 h-7 text-teal-600"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h2 id="premium-lock-title" className="text-xl font-bold text-gray-900 mb-2">
              AI Coach is Premium
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Chat with your AI habit coach, get personalized plans, and auto-fill your calendar.
              Upgrade to unlock.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors"
              >
                Upgrade to Premium
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium text-sm transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
