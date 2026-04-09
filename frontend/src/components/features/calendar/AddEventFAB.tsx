'use client'

import { motion } from 'framer-motion'

interface Props {
  onClick: () => void
}

export function AddEventFAB({ onClick }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label="Add new event"
      className="fixed bottom-10 right-10 w-16 h-16 bg-primary hover:bg-primary/90 rounded-full shadow-2xl shadow-primary/30 flex items-center justify-center text-white z-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
    >
      <span className="material-symbols-outlined text-2xl" aria-hidden="true">add</span>
    </motion.button>
  )
}
