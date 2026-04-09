'use client'

import { motion } from 'framer-motion'

const dotVariants = {
  initial: { y: 0 },
  animate: { y: [-4, 0] },
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4" aria-label="AI Coach is typing" aria-live="polite">
      <div className="flex flex-row items-end gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">smart_toy</span>
        </div>
        {/* Bubble */}
        <div className="bg-surface border border-outline rounded-2xl rounded-tl-none p-4 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-tertiary/40"
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
