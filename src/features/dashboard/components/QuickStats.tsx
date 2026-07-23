import Link from 'next/link'

interface Goal { name: string; targetAmount: number; currentAmount: number }

interface QuickStatsProps {
  codingStreak: number
  budgetRemaining: number
  workoutDoneToday: boolean
  goals: Goal[]
}

// Daily Operating System's "Sidebar Widget" (Phase 5 PRD) — deliberately NOT
// placed in the actual persistent left-nav Sidebar component, which is a
// global layout piece with no access to per-page data; fetching Dashboard-
// specific stats on every page app-wide just to populate it would be a
// wasted query on every other page. Rendered as a compact strip on the
// Dashboard page itself instead. Scoped to 3 stats — Protein/Steps Remaining
// (also listed in the PRD) would need a new health_profile fetch + target
// calculation to compute, a bigger lift than this widget's scope justifies.
// Goal Progress (previously its own Executive Brief card) folds in here too.
export default function QuickStats({ codingStreak, budgetRemaining, workoutDoneToday, goals }: QuickStatsProps) {
  const stats = [
    { label: 'Coding streak', value: `${codingStreak}d`, to: '/coding' },
    { label: "Today's budget", value: `₹${Math.round(budgetRemaining).toLocaleString('en-IN')} left`, to: '/finance' },
    { label: 'Workout', value: workoutDoneToday ? 'Done' : 'Pending', to: '/health' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {stats.map(s => (
          <Link key={s.label} href={s.to} className="flex-1 bg-surface-1 border border-surface-3 rounded-lg px-3 py-2 hover:border-accent/30 hover:bg-surface-2 transition-colors">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-sm font-semibold text-slate-200 tabular-nums">{s.value}</p>
          </Link>
        ))}
      </div>
      {goals.length > 0 && (
        <div className="flex gap-2">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0
            return (
              <Link key={g.name} href="/finance" className="flex-1 bg-surface-1 border border-surface-3 rounded-lg px-3 py-2 hover:border-accent/30 hover:bg-surface-2 transition-colors">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs text-slate-500 truncate">{g.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums shrink-0">{pct}%</p>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
