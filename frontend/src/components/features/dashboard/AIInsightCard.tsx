import Link from 'next/link'

interface AIInsightCardProps {
  insight?: string
}

export function AIInsightCard({ insight }: AIInsightCardProps) {
  return (
    <div className="bg-accent border border-outline rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-on-background" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">
          auto_awesome
        </span>
        <p className="text-sm font-semibold text-on-background">AI Insight</p>
      </div>
      <p className="text-sm text-on-background leading-relaxed">
        {insight ?? "You're building great momentum! Keep up your consistency and your streak will grow even stronger."}
      </p>
      <Link
        href="/ai-coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-tertiary hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        Chat with AI Coach
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  )
}
