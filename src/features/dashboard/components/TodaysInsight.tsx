import { Lightbulb } from 'lucide-react'
import Card from '@/components/Card'
import type { RecentPattern } from '@/features/brain/signals'

// Which module a pattern is about, inferred from its fixed wording — the 5
// pattern templates in brain/signals.ts's detectors are hardcoded sentences,
// not freeform AI text, so matching on their known phrasing is reliable
// (not a fragile heuristic against arbitrary text).
function moduleForPattern(pattern: string): string {
  if (pattern.includes('coding problems')) return 'Coding'
  if (pattern.includes('work out') || pattern.includes('protein')) return 'Health'
  return 'Insight'
}

// Daily Operating System's "Today's Insight" (Phase 5 PRD) — reuses the
// existing Weekly Pattern Mining detector's most-recently-confirmed pattern
// (already computed weekly, see brain/signals.ts) instead of a fresh
// per-day AI call. "Only one insight, high quality over quantity" is
// satisfied by showing at most the single strongest pattern, not a list.
export default function TodaysInsight({ pattern }: { pattern: RecentPattern | null }) {
  return (
    <Card title="Today's Insight" padding="p-3.5" action={<Lightbulb size={13} className="text-amber-400" />}>
      {pattern ? (
        <>
          <p className="text-sm text-fg-secondary leading-relaxed">{pattern.pattern}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-warn bg-surface-2 rounded px-2 py-0.5">Confirmed pattern</span>
            <span className="text-xs text-fg-tertiary">{moduleForPattern(pattern.pattern)} · seen {pattern.timesConfirmed}× in last 30 days</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-fg-secondary">No confirmed pattern yet — check back after a few more weeks of data</p>
      )}
    </Card>
  )
}
