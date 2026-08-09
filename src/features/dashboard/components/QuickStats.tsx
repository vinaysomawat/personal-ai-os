import Link from 'next/link'

interface Goal { name: string; targetAmount: number; currentAmount: number }

interface QuickStatsProps {
  codingStreak: number
  codingQuestionPending: boolean
  budgetRemaining: number
  budgetTotal: number
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
export default function QuickStats({ codingStreak, codingQuestionPending, budgetRemaining, budgetTotal, workoutDoneToday, goals }: QuickStatsProps) {
  const stats = [
    { label: 'Coding Streak', value: `🔥 ${codingStreak}d`, sub: codingQuestionPending ? "today still open" : "today solved", to: '/coding', color: codingStreak > 0 ? 'text-green-400' : 'text-fg-primary' },
    { label: 'Budget Remaining', value: `₹${Math.round(budgetRemaining).toLocaleString('en-IN')}`, sub: `of ₹${Math.round(budgetTotal).toLocaleString('en-IN')} this month`, to: '/finance', color: budgetRemaining < 0 ? 'text-red-400' : 'text-fg-primary' },
    { label: 'Workout Today', value: workoutDoneToday ? '✓ Done' : '○ Pending', sub: workoutDoneToday ? 'Logged' : 'Not yet', to: '/health', color: workoutDoneToday ? 'text-green-400' : 'text-fg-primary' },
  ]

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {stats.map(s => (
          <Link key={s.label} href={s.to} className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card px-4 py-3.5 hover:border-accent/30 hover:-translate-y-0.5 transition-all">
            <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px]">{s.label}</p>
            <p className={`text-[22px] font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-fg-tertiary mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>
      {goals.length > 0 && (
        <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card py-4 px-[18px] flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">Goal Progress</p>
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0
            return (
              <Link key={g.name} href="/finance" className="block group">
                <div className="flex items-baseline justify-between mb-1 text-[12.5px]">
                  <span className="text-fg-secondary group-hover:text-fg-primary truncate">{g.name}</span>
                  <span className="text-fg-tertiary shrink-0 tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-[4px] bg-surface-3 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
