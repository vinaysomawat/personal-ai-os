import { clock } from './war'

// Today's timeline — deterministic, client-safe. dayplan.ts layoutDay() lays
// the plan out on the clock; liveTimeline() re-flows it every minute: blocks
// not done by their slot move to now, fixed-time rows (meals, the interview
// with its warm-up and debrief) keep their place and the rest flow around
// them, Flex shrinks first, and anything past the planned end shows as over.
// Times are prep minutes (after IST midnight, past 1440 after midnight).

export type TimelineKind = 'block' | 'meal' | 'break' | 'flex' | 'warmup' | 'interview' | 'debrief'
export interface TimelineRow {
  kind: TimelineKind
  label: string
  start: number
  end: number
  // Plan block rows: its key and whether it is done.
  blockKey?: string
  done?: boolean
  // A block not done by its slot, moved to now.
  moved?: boolean
}
export interface Timeline {
  rows: TimelineRow[]
  // The row the clock is in (null before the day or after the last row).
  current: TimelineRow | null
  next: TimelineRow | null
  start: number
  end: number
  // Minutes past the planned end (0 = fits).
  over: number
}

const FIXED: TimelineKind[] = ['meal', 'warmup', 'interview', 'debrief']
const MIN_FLEX = 10

export function liveTimeline(planned: TimelineRow[], now: number): Timeline {
  const plannedStart = planned.length ? Math.min(...planned.map(r => r.start)) : now
  const plannedEnd = planned.length ? Math.max(...planned.map(r => r.end)) : now
  const fixed = planned.filter(r => FIXED.includes(r.kind)).sort((a, b) => a.start - b.start)
  const flowing = planned.filter(r => !FIXED.includes(r.kind))
  const isMissed = (r: TimelineRow) => r.kind === 'block' && !r.done && r.end <= now
  const rows: TimelineRow[] = [...fixed, ...flowing.filter(r => r.end <= now && !isMissed(r))]
  // A row in progress keeps its place — unless it's a block while earlier
  // blocks are still undone, so "now" is always the earliest undone work.
  const anyMissed = flowing.some(isMissed)
  const running = flowing.find(r => r.start <= now && now < r.end) ?? null
  const keep = running && (running.kind !== 'block' || !anyMissed) ? running : null
  // The first start ≥ t where `len` minutes clear every fixed row.
  const fitAt = (t: number, len: number) => {
    for (const f of fixed) if (f.start < t + len && f.end > t) t = f.end
    return t
  }
  let cursor = now
  if (keep) { rows.push(keep); cursor = keep.end }
  const todo = [...flowing.filter(isMissed).map(r => ({ ...r, moved: true })), ...flowing.filter(r => r.end > now && r !== keep)]
  for (const r of todo) {
    if (r.kind === 'flex') {
      const start = Math.max(r.start, cursor)
      if (r.end - start < MIN_FLEX) continue
      rows.push({ ...r, start })
      cursor = r.end
      continue
    }
    const len = r.end - r.start
    const start = fitAt(Math.max(r.start, cursor), len)
    rows.push({ ...r, start, end: start + len })
    cursor = start + len
  }
  rows.sort((a, b) => a.start - b.start)
  const end = rows.length ? Math.max(...rows.map(r => r.end)) : plannedEnd
  const current = rows.find(r => r.start <= now && now < r.end) ?? null
  const next = rows.find(r => r.start >= now && r !== current && !(r.kind === 'block' && r.done)) ?? null
  return { rows, current, next, start: plannedStart, end, over: Math.max(0, Math.round(end - plannedEnd)) }
}

export const span = (r: Pick<TimelineRow, 'start' | 'end'>) => `${clock(r.start)}–${clock(r.end)}`

export const overHint = (over: number) => over > 0 ? `runs ${over} min past the plan — drop or shorten the last slots in Edit today` : null
