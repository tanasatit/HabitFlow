'use client'

interface StreakBadgeProps {
  streak: number
}

function getStreakStyle(streak: number): { flame: string; text: string; bg: string } {
  if (streak >= 7) {
    return {
      flame: 'text-[#FF8243]',
      text: 'text-[#FF8243]',
      bg: 'bg-[#FF8243]/10',
    }
  }
  if (streak >= 3) {
    return {
      flame: 'text-[#FCE883]',
      text: 'text-[#FCE883]',
      bg: 'bg-[#FCE883]/10',
    }
  }
  return {
    flame: 'text-gray-500',
    text: 'text-gray-400',
    bg: 'bg-gray-800/50',
  }
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const style = getStreakStyle(streak)

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg}`}
      aria-label={`${streak} day streak`}
    >
      {/* Flame SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-3 h-3 ${style.flame}`}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
          clipRule="evenodd"
        />
      </svg>
      <span className={style.text}>{streak}</span>
    </span>
  )
}
