import type { Signal } from '@/lib/signals'
import type { RevisionItem } from './war'

// Topics due in the revision queue (rated answers averaging under 7) — the
// Prep counterpart of the old coding signals, for Needs Attention.
export function checkRevisionDue(items: RevisionItem[]): Signal | null {
  const due = items.filter(i => i.status === 'overdue' || i.status === 'today')
  if (due.length === 0) return null
  const top = due[0]
  return {
    id: 'prep.revision_due', module: 'prep', weight: 62, emoji: '🔁',
    href: `/prep?tab=questions&cat=${top.category}&topic=${encodeURIComponent(top.topic)}`,
    message: `${due.length} revision topic${due.length === 1 ? '' : 's'} due: ${top.topic} (${top.avgRating}/10)`,
  }
}
