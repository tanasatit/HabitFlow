'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'

interface StreakFlameProps {
  streak: number
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: { icon: 24, text: 'text-sm', gap: 'gap-1' },
  md: { icon: 40, text: 'text-xl', gap: 'gap-2' },
  lg: { icon: 56, text: 'text-3xl', gap: 'gap-3' },
}

function getFlameStyle(streak: number): { color: string; glow: string } {
  if (streak >= 7) {
    return {
      color: '#FF8243',
      glow: '0 0 12px 3px rgba(255,130,67,0.55)',
    }
  }
  if (streak >= 3) {
    return {
      color: '#FCE883',
      glow: '0 0 10px 2px rgba(252,232,131,0.40)',
    }
  }
  return { color: '#6B7280', glow: 'none' }
}

export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  const flameRef = useRef<SVGSVGElement>(null)
  const { icon, text, gap } = SIZE_MAP[size]
  const { color, glow } = getFlameStyle(streak)

  useEffect(() => {
    const el = flameRef.current
    if (!el || streak < 3) return

    const isHot = streak >= 7

    if (isHot) {
      // Flicker effect — irregular scale + slight rotation for high streaks
      const tl = gsap.timeline({ repeat: -1, yoyo: true })
      tl.to(el, {
        scale: 1.12,
        rotate: 2,
        duration: 0.18,
        ease: 'power1.inOut',
      })
        .to(el, {
          scale: 1.05,
          rotate: -1.5,
          duration: 0.14,
          ease: 'power1.inOut',
        })
        .to(el, {
          scale: 1.1,
          rotate: 1,
          duration: 0.16,
          ease: 'power1.inOut',
        })
        .to(el, {
          scale: 1.0,
          rotate: 0,
          duration: 0.2,
          ease: 'power1.inOut',
        })
    } else {
      // Gentle pulse for moderate streaks (3-6)
      gsap.to(el, {
        scale: 1.1,
        duration: 0.7,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    }

    return () => {
      gsap.killTweensOf(el)
      gsap.set(el, { clearProps: 'all' })
    }
  }, [streak])

  return (
    <div
      className={`inline-flex flex-col items-center ${gap}`}
      aria-label={`${streak} day streak`}
    >
      {/* Flame SVG — same path used in StreakBadge, scaled up */}
      <svg
        ref={flameRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={color}
        width={icon}
        height={icon}
        style={{ filter: glow !== 'none' ? `drop-shadow(${glow})` : undefined }}
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
          clipRule="evenodd"
        />
      </svg>

      <span
        className={`font-bold leading-none ${text}`}
        style={{ color }}
        aria-hidden="true"
      >
        {streak}
      </span>
    </div>
  )
}
