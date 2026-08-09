// Deterministic "Today's Progress" checklist — separate from Life Score.
// Life Score blends persistent module state (career profile, month-to-date
// budget, 30-day coding activity); this instead answers "how much of today
// specifically is done", resetting to a fresh set of items every midnight.
// No AI: this is pure counting over data the page already fetches.

export interface ProgressItem {
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
  codingToday: { completed: boolean }[]
  dailyRead: { completed: boolean } | null
  hasLearningResources: boolean
  studiedToday: boolean
  expenseLoggedToday: boolean
  codingQuizDone: boolean
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

  if (input.codingToday.length > 0) {
    items.push({ key: 'coding', label: "Solve today's coding question", done: input.codingToday.every(q => q.completed), href: '/coding' })
  }

  items.push({ key: 'coding-quiz', label: "Complete Today's Quiz", done: input.codingQuizDone, href: '/coding' })

  if (input.dailyRead) {
    items.push({ key: 'daily-read', label: "Read today's article", done: input.dailyRead.completed, href: '/learning' })
  }

  if (input.hasLearningResources) {
    items.push({ key: 'study', label: 'Log a study session', done: input.studiedToday, href: '/learning' })
  }

  items.push({ key: 'expense', label: "Log today's expenses", done: input.expenseLoggedToday, href: '/finance' })

  const completed = items.filter(i => i.done).length
  const total = items.length
  const score = total === 0 ? 100 : Math.round((completed / total) * 100)

  return { items, completed, total, score }
}
