import Link from 'next/link'

interface HabitAIInsightCardProps {
  totalHabits: number
  completedToday: number
}

export function HabitAIInsightCard({ totalHabits, completedToday }: HabitAIInsightCardProps) {
  const pct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0

  return (
    <div className="bg-tertiary text-white rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
          auto_awesome
        </span>
        <p className="text-sm font-semibold">AI Coach Insight</p>
      </div>
      <p className="text-sm leading-relaxed opacity-90">
        {pct >= 80
          ? "Incredible consistency! You're crushing your goals today."
          : pct >= 50
          ? `Great progress! You've completed ${completedToday} of ${totalHabits} rituals today.`
          : `Let's keep going — you've done ${completedToday} so far today. Every ritual counts!`}
      </p>
      <Link
        href="/ai-coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
      >
        Open AI Coach
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  )
}
