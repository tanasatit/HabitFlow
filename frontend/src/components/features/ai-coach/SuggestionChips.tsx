'use client'

interface Props {
  onSelect: (suggestion: string) => void
}

const SUGGESTIONS = [
  'Plan my week',
  'Build a morning routine',
  'Review my progress',
  'Add a gym habit',
]

export function SuggestionChips({ onSelect }: Props) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 px-4"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      aria-label="Suggested prompts"
    >
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-outline bg-surface px-5 py-2 text-sm font-bold text-on-background hover:border-primary hover:text-primary transition-all duration-150 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
