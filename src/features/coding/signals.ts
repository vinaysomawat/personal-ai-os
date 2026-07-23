import type { Signal } from '@/lib/signals'
import type { WeakArea } from './daily-core'

export function checkCodingWeakArea(weakAreas: WeakArea[]): Signal | null {
  const top = weakAreas[0]
  if (!top) return null
  return {
    id: 'coding.weak_area', module: 'coding', weight: 48, emoji: '🧩', href: '/coding',
    message: `Struggling with "${top.topic}" — ${top.strugglingCount}/${top.total} attempts, worth targeted practice`,
  }
}

export function checkQuestionPending(pending: boolean): Signal | null {
  if (!pending) return null
  return {
    id: 'coding.question_pending', module: 'coding', weight: 65, emoji: '💻', href: '/coding',
    message: "Today's coding question is still open",
  }
}

export function checkStaleRevision(count: number): Signal | null {
  if (count === 0) return null
  return {
    id: 'coding.stale_revision', module: 'coding', weight: 40, emoji: '🔁', href: '/coding',
    message: `${count} solved question${count > 1 ? 's' : ''} not revisited in 14+ days`,
  }
}
