interface EmptyStateProps {
  icon: string
  headline: string
  description: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ icon, headline, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4 px-4">
      <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center">
        <span className="material-symbols-outlined text-[28px] text-on-surface-variant" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="space-y-1">
        <p className="font-headline font-bold text-lg text-on-background">{headline}</p>
        <p className="text-sm text-on-surface-variant max-w-xs">{description}</p>
      </div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-2 px-6 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
