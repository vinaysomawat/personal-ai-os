import { clock, type DayWindow } from './war'
import type { PrepBlock } from './types'

// Today's timeline (v4.4) — deterministic, client-safe. Lays the day's plan
// blocks out on the clock inside your day window, with fixed life slots
// between them (meals, a walk, job applications, short breaks, a flex slot,
// a 5-minute review), then re-flows live: blocks not done by their slot move
// to now, the flex slot absorbs the delay first, and anything past the
// window shows how far over the day runs. Times are prep minutes (after IST
// midnight, continuing past 1440 after midnight — see war.ts dayWindow).

export type TimelineKind = 'block' | 'meal' | 'walk' | 'apps' | 'break' | 'flex' | 'review'
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
  // The row the clock is in (null before the window or after the last row).
  current: TimelineRow | null
  next: TimelineRow | null
  end: number
  // Minutes past the window end (0 = fits).
  over: number
}

// Life slots, fixed defaults: lunch and dinner at the first block boundary
// within 20 min of their target, a walk + the first applications slot after
// Build, a 10-min break after any block of 60+ minutes, and at the end a
// flex slot of up to 90 min (finish open blocks / the revision queue), the second
// applications slot and a 5-minute review.
const LUNCH = { label: '🍽️ Lunch', minutes: 40, at: 13 * 60 + 50 }
const DINNER = { label: '🍽️ Dinner', minutes: 40, at: 20 * 60 + 50 }
const MEAL_EARLY = 20
const WALK = { label: '🚶 Walk', minutes: 30 }
const APPS_1 = { label: '💼 Job applications', minutes: 45 }
const APPS_2 = { label: '💼 Job applications', minutes: 30 }
const BREAK = { label: '☕ Break', minutes: 10, after: 60 }
const FLEX_MAX = 90
const FLEX_LABEL = 'Flex — finish any open block, or the revision queue'
const REVIEW = { label: '📝 Review & plan tomorrow', minutes: 5 }

// The planned day from the window start: blocks in plan order with life
// slots between them.
export function planTimeline(blocks: PrepBlock[], window: DayWindow): TimelineRow[] {
  const rows: TimelineRow[] = []
  let t = window.start * 60
  const push = (kind: TimelineKind, label: string, minutes: number, block?: PrepBlock) => {
    rows.push({ kind, label, start: t, end: t + minutes, ...(block ? { blockKey: block.key, done: block.done } : {}) })
    t += minutes
  }
  let lunch = false, dinner = false, walked = false
  const meals = () => {
    if (!lunch && t >= LUNCH.at - MEAL_EARLY) { push('meal', LUNCH.label, LUNCH.minutes); lunch = true }
    if (!dinner && t >= DINNER.at - MEAL_EARLY) { push('meal', DINNER.label, DINNER.minutes); dinner = true }
  }
  blocks.forEach((b, i) => {
    push('block', b.label, b.minutes, b)
    const before = rows.length
    meals()
    if (!walked && (b.key === 'build' || (!blocks.some(x => x.key === 'build') && i === Math.floor(blocks.length / 2)))) {
      push('walk', WALK.label, WALK.minutes); push('apps', APPS_1.label, APPS_1.minutes); walked = true
    }
    // A short break after a long block, unless a meal or walk just came.
    if (rows.length === before && b.minutes >= BREAK.after && i < blocks.length - 1) push('break', BREAK.label, BREAK.minutes)
  })
  if (!walked) { push('walk', WALK.label, WALK.minutes); push('apps', APPS_1.label, APPS_1.minutes) }
  meals()
  // Flex fills what's left before the closing slots, up to an hour.
  const closing = APPS_2.minutes + REVIEW.minutes
  const flex = Math.max(0, Math.min(FLEX_MAX, window.end * 60 - closing - t))
  if (flex >= 10) push('flex', FLEX_LABEL, flex)
  push('apps', APPS_2.label, APPS_2.minutes)
  push('review', REVIEW.label, REVIEW.minutes)
  return rows
}

// Re-flow at `now` (prep minutes): rows that ended before now stay where
// they were, except blocks not done in their slot — those move to now. A
// life slot in progress (a meal, the walk) keeps its place and the moved
// blocks follow it; a block in progress while earlier blocks are still
// undone lines up behind them, so "now" is always the earliest undone work.
// The rest follow back to back from the later of their planned start and
// the cursor; the flex slot shrinks first to absorb the delay.
export function liveTimeline(planned: TimelineRow[], window: DayWindow, now: number): Timeline {
  const isMissed = (r: TimelineRow) => r.end <= now && r.kind === 'block' && !r.done
  const rows: TimelineRow[] = planned.filter(r => r.end <= now && !isMissed(r))
  const anyMissed = planned.some(isMissed)
  const running = planned.find(r => r.start <= now && now < r.end) ?? null
  const inProgress = running && (running.kind !== 'block' || !anyMissed) ? running : null
  let cursor = now
  if (inProgress) { rows.push(inProgress); cursor = inProgress.end }
  for (const r of planned.filter(isMissed)) {
    const len = r.end - r.start
    rows.push({ ...r, start: cursor, end: cursor + len, moved: true })
    cursor += len
  }
  for (const r of planned.filter(r => r.end > now && r !== inProgress)) {
    const start = Math.max(r.start, cursor)
    const len = r.kind === 'flex' ? r.end - r.start - (start - r.start) : r.end - r.start
    if (len <= 0) continue
    rows.push({ ...r, start, end: start + len })
    cursor = start + len
  }
  const end = rows.length ? rows[rows.length - 1].end : window.start * 60
  const current = rows.find(r => r.start <= now && now < r.end) ?? null
  const next = rows.find(r => r.start >= now && r !== current && !(r.kind === 'block' && r.done)) ?? null
  return { rows, current, next, end, over: Math.max(0, Math.round(end - window.end * 60)) }
}

export function buildTimeline(blocks: PrepBlock[], window: DayWindow, nowPrepHour: number): Timeline {
  return liveTimeline(planTimeline(blocks, window), window, Math.round(nowPrepHour * 60))
}

export const span = (r: Pick<TimelineRow, 'start' | 'end'>) => `${clock(r.start)}–${clock(r.end)}`

// What to drop when the day runs over: Flex is already gone by then, so the
// smallest share first.
export const overHint = (over: number) => over > 0 ? `runs ${over} min past your window — drop the Backend block first, then shorten Theory` : null
