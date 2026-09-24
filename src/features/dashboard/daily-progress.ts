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
  tasksDueToday: { id: string; text: string; done: boolean }[]
  metricsLoggedToday: boolean
  workoutStatus: 'completed' | 'pending' | 'none'
  // Every active coding pick (all slots, carried-over included), with
  // whether it was completed today (IST).
  codingPicks: { completed: boolean; completedToday: boolean }[]
  dailyRead: { completed: boolean } | null
  expenseLoggedToday: boolean
}

export function computeTodayProgress(input: TodayProgressInput): TodayProgress {
  const items: ProgressItem[] = []

  for (const t of input.tasksDueToday) {
    items.push({ key: `task-${t.id}`, label: t.text, done: t.done, href: '/planner' })
  }

  items.push({ key: 'health-metrics', label: "Log today's health metrics", done: input.metricsLoggedToday, href: '/health' })

  if (input.workoutStatus !== 'none') {
    items.push({ key: 'workout', label: "Complete today's workout", done: input.workoutStatus === 'completed', href: '/health' })
  }

  // One coding item, not one per pick (was 4 of ~8 items — algorithm,
  // quiz, JS function, UI coding — so coding alone decided the mission).
  // Done once any pick is finished today: consistency over volume, same as
  // the Coding sub-score and streak.
  if (input.codingPicks.length > 0) {
    const doneCount = input.codingPicks.filter(p => p.completed).length
    items.push({ key: 'coding', label: `Coding practice — finish 1 of today's picks (${doneCount}/${input.codingPicks.length} done)`, done: input.codingPicks.some(p => p.completedToday), href: '/coding' })
  }

  if (input.dailyRead) {
    items.push({ key: 'daily-read', label: "Read today's article", done: input.dailyRead.completed, href: '/learning' })
  }

  items.push({ key: 'expense', label: "Log today's expenses", done: input.expenseLoggedToday, href: '/finance' })

  const completed = items.filter(i => i.done).length
  const total = items.length
  const score = total === 0 ? 100 : Math.round((completed / total) * 100)

  return { items, completed, total, score }
}
