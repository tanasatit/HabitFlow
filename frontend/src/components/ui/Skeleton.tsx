interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle'
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ variant = 'rect', className = '', width, height }: SkeletonProps) {
  const base = 'bg-surface-variant animate-pulse'
  const variantClass =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-md' : 'rounded-2xl'

  return (
    <div
      className={`${base} ${variantClass} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-8 animate-pulse" aria-label="Loading dashboard">
      <Skeleton variant="text" className="h-10 w-72" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4">
          <Skeleton className="h-40" />
        </div>
        <div className="col-span-12 md:col-span-8">
          <Skeleton className="h-40" />
        </div>
      </div>
      <Skeleton variant="text" className="h-6 w-40" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  )
}

export function HabitsGridSkeleton() {
  return (
    <div className="p-6 md:p-8" aria-label="Loading habits">
      <Skeleton variant="text" className="h-12 w-48 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse" aria-label="Loading calendar">
      <Skeleton variant="text" className="h-10 w-64" />
      <Skeleton className="h-[480px]" />
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse" aria-label="Loading chat">
      <div className="flex items-end gap-3">
        <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
        <Skeleton className="h-16 w-2/3" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-1/2" />
      </div>
      <div className="flex items-end gap-3">
        <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />
        <Skeleton className="h-20 w-3/4" />
      </div>
    </div>
  )
}
