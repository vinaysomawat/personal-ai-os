import { Lightbulb } from 'lucide-react'
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
// Doesn't use the shared Card component — the design puts the 💡 icon to the
// left of the title, not in Card's right-aligned action slot.
export default function TodaysInsight({ pattern }: { pattern: RecentPattern | null }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-[18px] shadow-card p-[var(--card-pad-lg)]">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Lightbulb size={14} className="text-amber-400" />
        <p className="text-[13px] font-bold text-fg-primary">Today&apos;s Insight</p>
      </div>
      {pattern ? (
        <>
          <p className="text-[13.5px] leading-[1.55] text-fg-secondary">{pattern.pattern}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.3px] text-warn bg-surface-2 rounded-[5px] px-2 py-[3px]">Confirmed pattern</span>
            <span className="text-xs text-fg-tertiary">{moduleForPattern(pattern.pattern)} · seen {pattern.timesConfirmed}× in last 30 days</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-fg-secondary">No confirmed pattern yet — check back after a few more weeks of data</p>
      )}
    </div>
  )
}
