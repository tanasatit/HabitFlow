interface CreateRitualCardProps {
  onClick: () => void
}

export function CreateRitualCard({ onClick }: CreateRitualCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-surface border-2 border-dashed border-outline rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] hover:border-primary hover:bg-primary/5 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full group"
      aria-label="Create new ritual"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-variant group-hover:bg-primary/10 flex items-center justify-center transition-colors">
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:text-primary transition-colors" aria-hidden="true">
          add
        </span>
      </div>
      <p className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
        Create a New Ritual
      </p>
    </button>
  )
}
