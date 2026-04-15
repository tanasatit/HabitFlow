/**
 * Framer Motion mock for Jest / jsdom.
 *
 * Strips all motion-specific props (layout, initial, animate, exit, etc.)
 * before forwarding to the real DOM element so jsdom does not emit
 * "Received `true` for a non-boolean attribute" warnings.
 */
import React from 'react'

const MOTION_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants',
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
  'layout', 'layoutId', 'layoutDependency',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'onAnimationStart', 'onAnimationComplete',
  'onDragStart', 'onDragEnd', 'onDrag',
  'onLayoutAnimationStart', 'onLayoutAnimationComplete',
])

function stripMotionProps(props: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (!MOTION_PROPS.has(key)) clean[key] = props[key]
  }
  return clean
}

function createMotionComponent(tag: string) {
  const Component = React.forwardRef(
    (props: Record<string, unknown> & { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
      const { children, ...rest } = props
      return React.createElement(tag, { ...stripMotionProps(rest), ref }, children)
    }
  )
  Component.displayName = `motion.${tag}`
  return Component
}

const cache: Record<string, ReturnType<typeof createMotionComponent>> = {}

export const motion = new Proxy({} as Record<string, ReturnType<typeof createMotionComponent>>, {
  get(_, tag: string) {
    if (!cache[tag]) cache[tag] = createMotionComponent(tag)
    return cache[tag]
  },
})

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>

export const useAnimation = () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() })
export const useMotionValue = (initial: unknown) => ({ get: () => initial, set: jest.fn() })
export const useTransform = (_: unknown, __: unknown, output: unknown[]) => ({ get: () => output[0], set: jest.fn() })
export const useSpring = (initial: unknown) => ({ get: () => initial, set: jest.fn() })
export const useScroll = () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } })
export const useInView = () => true
export const useDragControls = () => ({ start: jest.fn() })
export const easeInOut = (t: number) => t
export const easeIn = (t: number) => t
export const easeOut = (t: number) => t
