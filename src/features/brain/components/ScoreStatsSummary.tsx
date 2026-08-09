const MODULES = ['Health', 'Finance', 'Career', 'Learning', 'Projects'] as const

interface ScoreStatsSummaryProps {
  daysTracked: number
  totalDays: number
  avgLife: number
  moduleAvgs: { Health: number; Finance: number; Career: number; Learning: number; Projects: number }
  best: { date: string; score: number }
  worst: { date: string; score: number }
  periodLabel: string
}

// Shared between Weekly Reflection and Monthly Executive Review — same
// score-bar breakdown, just a different lookback window and days-tracked total.
export default function ScoreStatsSummary({ daysTracked, totalDays, avgLife, moduleAvgs, best, worst, periodLabel }: ScoreStatsSummaryProps) {
  const strongest = MODULES.reduce((a, b) => (moduleAvgs[b] > moduleAvgs[a] ? b : a))
  const weakest = MODULES.reduce((a, b) => (moduleAvgs[b] < moduleAvgs[a] ? b : a))

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-xs text-fg-tertiary">Avg Life Score ({daysTracked}/{totalDays} days) <span className="font-bold text-fg-primary tabular-nums">{avgLife}/100</span></p>

      <div className="flex gap-2.5">
        <div className="bg-good-soft rounded-[8px] px-3 py-2 flex-1">
          <p className="text-[10px] text-fg-tertiary uppercase tracking-[0.3px]">Best Day</p>
          <p className="text-[13px] font-bold text-good mt-0.5">{best.date} · {best.score}</p>
        </div>
        <div className="bg-risk-soft rounded-[8px] px-3 py-2 flex-1">
          <p className="text-[10px] text-fg-tertiary uppercase tracking-[0.3px]">Worst Day</p>
          <p className="text-[13px] font-bold text-risk mt-0.5">{worst.date} · {worst.score}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2.5">{periodLabel} · per module</p>
        {MODULES.map(m => {
          const isStrongest = m === strongest
          const isWeakest = m === weakest
          const tag = isStrongest ? '· strongest' : isWeakest ? '· weakest' : ''
          const color = isStrongest ? 'text-good' : isWeakest ? 'text-risk' : 'text-fg-secondary'
          const barColor = isStrongest ? 'bg-good' : isWeakest ? 'bg-risk' : 'bg-accent'
          return (
            <div key={m} className="mb-2.5 last:mb-0">
              <div className="flex justify-between text-xs mb-1">
                <span className={color}>{m} {tag}</span>
                <span className={`font-bold ${color}`}>{moduleAvgs[m]}</span>
              </div>
              <div className="h-[5px] rounded-[3px] bg-border">
                <div className={`h-full rounded-[3px] ${barColor}`} style={{ width: `${moduleAvgs[m]}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
