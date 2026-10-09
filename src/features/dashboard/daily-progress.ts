// Deterministic "Today's Progress" checklist — separate from Life Score.
// Life Score blends persistent module state (career profile, month-to-date
// budget, 30-day coding activity); this instead answers "how much of today
// specifically is done", resetting to a fresh set of items every midnight.
// No AI: this is pure counting over data the page already fetches.

interface ProgressItem {
  key: string
  label: string
  done: boolean
  href: string
}

export interface TodayProgress {
  items: ProgressItem[]
  completed: number
  total: number
  score: number
}

export interface TodayProgressInput {
  metricsLoggedToday: boolean
  workoutStatus: 'completed' | 'pending' | 'none'
  // Today's Prep plan (prep_sessions), null when none is built yet.
  prepBlocks: { done: number; total: number } | null
  expenseLoggedToday: boolean
}

export function computeTodayProgress(input: TodayProgressInput): TodayProgress {
  const items: ProgressItem[] = []

  items.push({ key: 'health-metrics', label: "Log today's health metrics", done: input.metricsLoggedToday, href: '/health' })

  if (input.workoutStatus !== 'none') {
    items.push({ key: 'workout', label: "Complete today's workout", done: input.workoutStatus === 'completed', href: '/health' })
  }

  // One Prep item for today's whole plan (replaced the Coding item when
  // Coding was folded into Prep, 2026-10-10).
  if (input.prepBlocks && input.prepBlocks.total > 0) {
    items.push({ key: 'prep', label: `Prep session: ${input.prepBlocks.done}/${input.prepBlocks.total} blocks done`, done: input.prepBlocks.done >= input.prepBlocks.total, href: '/prep' })
  }

  items.push({ key: 'expense', label: "Log today's expenses", done: input.expenseLoggedToday, href: '/finance' })

  const completed = items.filter(i => i.done).length
  const total = items.length
  const score = total === 0 ? 100 : Math.round((completed / total) * 100)

  return { items, completed, total, score }
}
