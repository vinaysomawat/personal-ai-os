import Link from 'next/link'

interface QuickStatsProps {
  codingStreak: number
  codingQuestionPending: boolean
  workoutStreak: number
  workoutCategory: string | null
  budgetRemaining: number
  budgetTotal: number
  workoutDoneToday: boolean
}

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`

// Daily Operating System's "Sidebar Widget" (Phase 5 PRD) — deliberately NOT
// placed in the actual persistent left-nav Sidebar component, which is a
// global layout piece with no access to per-page data; fetching Dashboard-
// specific stats on every page app-wide just to populate it would be a
// wasted query on every other page. Rendered as a compact strip on the
// Dashboard page itself instead. Protein/Steps Remaining (also listed in the
// PRD) would need a new health_profile fetch + target calculation to
// compute, a bigger lift than this widget's scope justifies.
export default function QuickStats({ codingStreak, codingQuestionPending, workoutStreak, workoutCategory, budgetRemaining, budgetTotal, workoutDoneToday }: QuickStatsProps) {
  const stats = [
    { label: 'Coding Streak', value: `🔥 ${plural(codingStreak)}`, sub: codingQuestionPending ? "today still open" : "today solved", to: '/coding', color: 'text-fg-primary' },
    { label: 'Workout Streak', value: `🏋️ ${plural(workoutStreak)}`, sub: workoutDoneToday ? 'Logged today' : workoutCategory ? `${workoutCategory} today` : 'Not yet today', to: '/health', color: 'text-fg-primary' },
    { label: 'Budget Remaining', value: `₹${Math.round(budgetRemaining).toLocaleString('en-IN')}`, sub: `of ₹${Math.round(budgetTotal).toLocaleString('en-IN')} this month`, to: '/finance', color: (budgetRemaining / budgetTotal) < 0.15 ? 'text-risk' : (budgetRemaining / budgetTotal) < 0.3 ? 'text-warn' : 'text-good' },
    { label: 'Workout Today', value: workoutDoneToday ? '✓ Done' : '○ Pending', sub: workoutDoneToday ? 'Logged' : 'Not yet', to: '/health', color: workoutDoneToday ? 'text-good' : 'text-warn' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
      {stats.map(s => (
        <Link key={s.label} href={s.to} className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-[var(--card-pad-sm)] hover:-translate-y-0.5 transition-all">
          <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px]">{s.label}</p>
          <p className={`text-[22px] font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-[11px] text-fg-tertiary mt-0.5">{s.sub}</p>
        </Link>
      ))}
    </div>
  )
}
