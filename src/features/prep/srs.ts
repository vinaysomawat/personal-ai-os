import type { Flashcard, ReviewGrade } from './types'

// SM-2-style spaced repetition (deterministic, Product Principle 2).
// "again" resets the card to tomorrow and lowers ease; "hard" grows the
// interval slowly; "good" by ease; "easy" by ease with a bonus. Ease is
// floored at 1.3 so a card never collapses into daily repeats forever.
const MIN_EASE = 1.3

export interface ScheduleResult {
  ease: number
  interval_days: number
  reps: number
  lapses: number
  due_date: string
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

export function scheduleReview(card: Pick<Flashcard, 'ease' | 'interval_days' | 'reps' | 'lapses'>, grade: ReviewGrade, today: string): ScheduleResult {
  let ease = Number(card.ease)
  let interval: number
  let reps = card.reps
  let lapses = card.lapses

  if (grade === 'again') {
    ease = Math.max(MIN_EASE, ease - 0.2)
    interval = 1
    reps = 0
    lapses += 1
  } else {
    if (grade === 'hard') ease = Math.max(MIN_EASE, ease - 0.15)
    if (grade === 'easy') ease += 0.15
    const prev = card.interval_days
    if (reps === 0) interval = grade === 'easy' ? 3 : 1
    else if (reps === 1) interval = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6
    else interval = Math.round(prev * (grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease))
    interval = Math.max(1, interval)
    reps += 1
  }

  return { ease: Math.round(ease * 100) / 100, interval_days: interval, reps, lapses, due_date: addDays(today, interval) }
}

// Preview label for each grade button ("1d", "6d", "2mo").
export function intervalLabel(days: number): string {
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}
