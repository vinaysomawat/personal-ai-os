const MODULES = ['Health', 'Finance', 'Career', 'Learning', 'Projects'] as const

interface ScoreStatsSummaryProps {
  daysTracked: number
  totalDays: number
  avgLife: number
  moduleAvgs: { Health: number; Finance: number; Career: number; Learning: number; Projects: number }
  best: { date: string; score: number }
  worst: { date: string; score: number }
}

// Shared between Weekly Reflection and Monthly Executive Review — same
// score-bar breakdown, just a different lookback window and days-tracked total.
export default function ScoreStatsSummary({ daysTracked, totalDays, avgLife, moduleAvgs, best, worst }: ScoreStatsSummaryProps) {
  return (
    <div className="space-y-1.5 bg-surface-2 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-fg-tertiary">Avg Life Score ({daysTracked}/{totalDays} days)</span>
        <span className="text-sm font-bold text-fg-primary tabular-nums">{avgLife}/100</span>
      </div>
      {MODULES.map(m => (
        <div key={m} className="flex items-center gap-2">
          <span className="text-xs text-fg-tertiary w-16 shrink-0">{m}</span>
          <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${moduleAvgs[m]}%` }} />
          </div>
          <span className="text-xs text-fg-secondary tabular-nums w-7 text-right">{moduleAvgs[m]}</span>
        </div>
      ))}
      <div className="text-xs text-fg-tertiary pt-1">
        Best {best.score} ({best.date}) · Worst {worst.score} ({worst.date})
      </div>
    </div>
  )
}
