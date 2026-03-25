'use client'

import { motion } from 'framer-motion'

interface ProgressRingProps {
  /** Completion value from 0.0 to 1.0 */
  progress: number
  /** Diameter of the ring in px. Default: 120 */
  size?: number
  /** Stroke width in px. Default: 8 */
  strokeWidth?: number
  /** Text displayed in the centre of the ring */
  label?: string
  /** Accessible label for screen readers */
  ariaLabel?: string
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  label,
  ariaLabel,
}: ProgressRingProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - clampedProgress)
  const center = size / 2

  const displayLabel = label ?? `${Math.round(clampedProgress * 100)}%`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={ariaLabel ?? `Progress: ${displayLabel}`}
      role="img"
      aria-valuenow={Math.round(clampedProgress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#374151" /* gray-700 */
        strokeWidth={strokeWidth}
      />

      {/* Progress arc — animated from fully-offset (empty) to target offset */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#FF8243" /* tropical-orange */
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: targetOffset }}
        transition={{ type: 'spring', duration: 0.8 }}
        /* Start arc at the top */
        transform={`rotate(-90 ${center} ${center})`}
      />

      {/* Centre label */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F5F5F5"
        fontSize={size * 0.18}
        fontWeight="700"
        aria-hidden="true"
      >
        {displayLabel}
      </text>
    </svg>
  )
}
