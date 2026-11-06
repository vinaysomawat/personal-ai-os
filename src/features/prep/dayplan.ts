import { BANK_CATEGORIES, bankBlock, baseKey, catOf, type BankCategory, type CategoryCoverage } from './hunt'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'
import { buildBlock, learnBlock, type RoadmapStepDone } from './roadmap'
import type { TimelineRow } from './timeline'
import type { PrepBlock } from './types'

// The day (v4.5) — deterministic, client-safe. A day template (your
// sessions, the gaps between them, breaks, and minutes per slot a day) gives
// the recommended plan; layoutDay() puts it on the clock.
// Times are prep minutes (after IST midnight, past 1440 after midnight; the
// Prep day rolls over at 4am — see lib/date prepToday).

export interface DaySession { label: string; start: number; end: number }
export interface DayTemplate {
  // The first session's start is the day's start (prep_settings.day_start_min
  // or today's own start) — only it moves; the rest are fixed.
  sessions: DaySession[]
  // Labels for the gaps between sessions, in order.
  gaps: string[]
  // Plan key → minutes a day, the same every day (absent / 0 = off). For
  // 'mock' any value > 0 means "the scheduled mock on its days" (Sun / Tue /
  // Thu / Sat; its format sets the time).
  minutes: Record<string, number>
}

// Plan keys in day order: quick, sharp work first (morning), deep work at the
// library, lighter spoken work late. It is also the drop order on a short
// day: the later a key, the sooner it gives way.
export const ORDER = [
  'bank:algorithm', 'bank:javascript-functions', 'bank:quiz',
  'bank:system-design', 'bank:ui-coding', 'bank:code-review',
  'bank:architecture', 'mock', 'bank:ai-engineering',
  'bank:backend', 'apply', 'bank:ai-native', 'bank:angular', 'bank:behavioral', 'bank:resume',
] as const
export type PlanKey = typeof ORDER[number]
export const PLAN_LABEL: Record<PlanKey, string> = {
  ...Object.fromEntries(BANK_CATEGORIES.map(c => [`bank:${c.key}`, c.label])) as Record<string, string>,
  mock: 'Mock round (scheduled)', apply: '💼 Job applications',
} as Record<PlanKey, string>

// The default day (≈ 5h + the mock on its days): real output fades after
// about four hours, so a plan you finish beats a 10-hour one you abandon.
// Five talk-through categories (the weakest) against four changes of mode
// (two hands-on blocks, applications, the mock), so the rotation rarely has to
// put two talk blocks together; the rest stay in the bank.
const DEFAULT_MINUTES: Partial<Record<PlanKey, number>> = {
  'bank:system-design': 60, 'bank:ui-coding': 45, 'bank:code-review': 30,
  'bank:architecture': 30, mock: 1, 'bank:ai-engineering': 30,
  'bank:backend': 30, apply: 30, 'bank:resume': 30,
}
export const DEFAULT_TEMPLATE: DayTemplate = {
  sessions: [
    { label: 'Morning', start: 11 * 60, end: 13 * 60 },
    { label: 'Library', start: 14 * 60 + 30, end: 21 * 60 + 30 },
    { label: 'Late', start: 22 * 60 + 30, end: 24 * 60 + 30 },
  ],
  gaps: ['🍽️ Lunch', '🍽️ Dinner + walk'],
  minutes: DEFAULT_MINUTES as Record<string, number>,
}

// A stored template over the defaults (missing pieces fall back). A template
// saved before minutes were one value per day (`weekly`, Sunday first) reads
// as each slot's highest weekday value.
export function templateOf(stored: (Partial<DayTemplate> & { weekly?: Record<string, number>[] }) | null | undefined): DayTemplate {
  const { weekly, sessions, gaps, minutes } = stored ?? {}
  const rest = { ...(sessions ? { sessions } : {}), ...(gaps ? { gaps } : {}), ...(minutes ? { minutes } : {}) }
  const t: DayTemplate = { ...DEFAULT_TEMPLATE, ...rest }
  if (!rest.minutes && weekly?.length) {
    const merged: Record<string, number> = {}
    for (const d of weekly) for (const [k, v] of Object.entries(d)) merged[k] = Math.max(merged[k] ?? 0, v)
    t.minutes = merged
  }
  return t
}

export interface PlanCtx {
  coverage: CategoryCoverage[]
  gaps?: Record<string, number>
  focusTopic?: string | null
  mockDoneToday?: boolean
  // Ticked roadmap steps — Learn / Build follow the week's next step.
  roadmapSteps?: RoadmapStepDone[]
}
const EMPTY_COVERAGE = (key: BankCategory): CategoryCoverage => ({ key, label: BANK_CATEGORIES.find(c => c.key === key)?.label ?? key, total: 0, seen: 0, doneToday: 0, redoDue: 0 })

// One plan item: a question block (redo guide and gap from coverage), Learn /
// Build (the roadmap week; no longer planned, kept for slots on older days), the day's scheduled mock, or your own slot (`custom:<id>`, its label
// given). null when it has nothing that day (no roadmap week, no mock).
export function blockFor(key: string, minutes: number, date: string, ctx: PlanCtx, customLabel?: string): PrepBlock | null {
  // An extra slot (`<key>~<n>`) is built like its plan item and keeps its own key.
  if (key !== baseKey(key)) { const b = blockFor(baseKey(key), minutes, date, ctx, customLabel); return b && { ...b, key, done: false } }
  const gap = (k: string) => ctx.gaps?.[k] ?? 0
  const cov = (k: BankCategory) => ctx.coverage.find(c => c.key === k) ?? EMPTY_COVERAGE(k)
  if (key.startsWith('custom:')) return { key, label: customLabel?.trim() || 'My slot', minutes, detail: 'Your own slot — Finish it from the timer.', href: '/prep?tab=today', done: false }
  // Job applications: no questions to count, so it's done by Finish on the timer.
  if (key === 'apply') return { key, label: PLAN_LABEL.apply, minutes, detail: 'Apply to roles posted in the last 48h and send referral messages — Finish it from the timer.', href: '/prep?tab=today', done: false }
  if (key === 'learn') return learnBlock(date, minutes, ctx.roadmapSteps ?? [])
  if (key === 'build') return buildBlock(date, minutes, ctx.roadmapSteps ?? [])
  if (key === 'mock') {
    const format = mockFormatForDay(date)
    return format ? {
      key: 'mock', label: `Mock round · ${formatOf(format).label}`, minutes: formatMinutes(format),
      detail: 'Timed, no notes. Run the one-click AI review after.',
      href: `/prep?tab=mock&format=${format}`, done: !!ctx.mockDoneToday,
    } : null
  }
  if (!key.startsWith('bank:')) return null
  const cat = key.slice(5) as BankCategory
  return bankBlock(cov(cat), minutes, {
    prefix: '',
    focusTopic: cat === 'quiz' ? ctx.focusTopic : null, gap: gap(cat),
  })
}

// Job applications run as two slots a day: half in the normal flow, the rest
// in the day's last session (layoutDay holds NIGHT_SLOT back for it). Under
// APPLY_SPLIT_MIN it stays one slot.
const NIGHT_SLOT = 'apply~2'
const APPLY_SPLIT_MIN = 20

// The recommended plan for a date: the template's keys in ORDER with their
// minutes, the mock only on its scheduled days, then put in day order by
// rotate().
export function planItems(date: string, template: DayTemplate, ctx: PlanCtx): PrepBlock[] {
  const minutes = template.minutes
  const out: PrepBlock[] = []
  const applyMinutes = minutes.apply ?? 0
  const splitApply = applyMinutes >= APPLY_SPLIT_MIN
  const firstApply = Math.ceil(applyMinutes / 10) * 5
  for (const key of ORDER) {
    let m = minutes[key] ?? 0
    if (m <= 0) continue
    if (key === 'apply' && splitApply) m = firstApply
    const b = blockFor(key, m, date, ctx)
    if (b) out.push(b)
  }
  const plan = speakLate(rotate(out, ctx.coverage))
  const night = splitApply ? blockFor(NIGHT_SLOT, applyMinutes - firstApply, date, ctx) : null
  return night ? [...plan, night] : plan
}

// Typing gets tiring and speaking is closer to the real interview, so the
// talk-through blocks from SPEAK_AFTER planned minutes into the day say to
// answer out loud (🎙 Speak counts the same) or as a Telegram voice drill.
const SPEAK_AFTER = 180
const DRILL_WORD: Record<string, string> = {
  'system-design': 'system design', architecture: 'architecture', 'ai-engineering': 'ai engineering', backend: 'backend',
  resume: 'resume', 'ai-native': 'ai', quiz: 'theory', angular: 'angular', behavioral: 'behavioral',
}
function speakLate(blocks: PrepBlock[]): PrepBlock[] {
  let t = 0
  return blocks.map(b => {
    const at = t
    t += b.minutes
    return at >= SPEAK_AFTER && isTalk(b)
      ? { ...b, detail: `🎙 Speak these — or text the Daily bot "drill ${DRILL_WORD[catOf(b.key)]}" and answer on a walk. ${b.detail}` }
      : b
  })
}

// Talk-through categories: read a question, answer it out loud or typed, get a
// review. Everything else (hands-on coding, code review, Learn + Build,
// applications, the mock) is a change of mode.
const TALK = new Set(['system-design', 'architecture', 'ai-engineering', 'backend', 'resume', 'ai-native', 'quiz', 'angular', 'behavioral'])
const isTalk = (b: PrepBlock) => b.key.startsWith('bank:') && TALK.has(catOf(b.key))

// Least-covered first, without two talk-through blocks in a row: the talk
// blocks sorted by coverage (practised / total, ascending; ties keep ORDER)
// alternate with the other items, the hands-on question blocks among those
// also by coverage. Learn and Build stay together as one change of mode.
// Talk blocks left over once the others run out go at the end.
function rotate(blocks: PrepBlock[], coverage: CategoryCoverage[]): PrepBlock[] {
  const pct = (b: PrepBlock) => { const c = coverage.find(x => `bank:${x.key}` === b.key); return c?.total ? c.seen / c.total : 1 }
  const talk = blocks.filter(isTalk).sort((a, b) => pct(a) - pct(b))
  const rest = blocks.filter(b => !isTalk(b))
  const slots = rest.flatMap((b, i) => b.key.startsWith('bank:') ? [i] : [])
  const sorted = slots.map(i => rest[i]).sort((a, b) => pct(a) - pct(b))
  slots.forEach((i, k) => { rest[i] = sorted[k] })
  const others: PrepBlock[][] = []
  rest.forEach((b, i) => { if (b.key === 'build' && rest[i - 1]?.key === 'learn') others[others.length - 1].push(b); else others.push([b]) })
  const out: PrepBlock[] = []
  for (let i = 0; i < Math.max(talk.length, others.length); i++) {
    if (talk[i]) out.push(talk[i])
    if (others[i]) out.push(...others[i])
  }
  return out
}

// An interview prep's matched categories (jd.ts matchJD, strongest first)
// take the first question-block slots of their kind (talk-through or
// hands-on, so the rotation holds); open blocks only, everything else keeps
// its place.
export function frontLoad(blocks: PrepBlock[], categories: string[]): PrepBlock[] {
  const rank = (b: PrepBlock) => { const i = categories.indexOf(catOf(b.key)); return i < 0 ? Infinity : i }
  const out = [...blocks]
  for (const talk of [true, false]) {
    const slots = out.flatMap((b, i) => b.key.startsWith('bank:') && !b.done && isTalk(b) === talk ? [i] : [])
    const sorted = slots.map(i => out[i]).sort((a, b) => { const d = rank(a) - rank(b); return Number.isNaN(d) ? 0 : d })
    slots.forEach((i, k) => { out[i] = sorted[k] })
  }
  return out
}

// Interview today (prep_sessions.interview): a warm-up before, a debrief
// after. Before the day's start it moves the start earlier (gym skipped).
export interface Interview { start: number; minutes: number; label?: string }
// Your own breaks today (prep_sessions.breaks), fixed times — there are no
// automatic breaks.
// `meal` = the index of the template gap (lunch, dinner) this moves today.
export interface DayBreak { start: number; end: number; label?: string; meal?: number }
// Today's meal times: the template gaps, with today's overrides.
export const mealsOf = (template: DayTemplate, breaks: DayBreak[]): DayBreak[] => template.sessions.slice(1).map((s, i) => {
  const o = breaks.find(b => b.meal === i)
  return { start: o?.start ?? template.sessions[i].end, end: o?.end ?? s.start, label: o?.label ?? template.gaps[i] ?? 'Break', meal: i }
})
export const WARMUP_MINUTES = 30
export const DEBRIEF_MINUTES = 15
const FLEX_LABEL = 'Flex — finish any open block, or redo weak answers'
const MIN_FLEX = 10

// Lays the day's items (in their order) into the sessions, around an
// interview and your breaks: each free stretch takes the first items in order
// that fit (a shorter later item fills a gap a longer one can't); leftover
// time in a stretch is Flex. Items that fit nowhere come back as `dropped`.
export function layoutDay(items: PrepBlock[], template: DayTemplate, dayStart: number, interview: Interview | null, breaks: DayBreak[] = []): { rows: TimelineRow[]; dropped: PrepBlock[] } {
  const sessions = template.sessions.map(s => ({ ...s }))
  if (sessions.length) sessions[0].start = Math.min(dayStart, sessions[0].end)
  const events: TimelineRow[] = interview ? [
    { kind: 'warmup', label: 'Warm-up — stories, notes, the company', start: interview.start - WARMUP_MINUTES, end: interview.start },
    { kind: 'interview', label: interview.label?.trim() || 'Interview', start: interview.start, end: interview.start + interview.minutes },
    { kind: 'debrief', label: 'Debrief — write down every question', start: interview.start + interview.minutes, end: interview.start + interview.minutes + DEBRIEF_MINUTES },
  ] : []
  if (interview && sessions.length && events[0].start < sessions[0].start) sessions[0].start = events[0].start
  // A meal moved today ends the session before it and starts the next.
  for (const b of breaks) if (b.meal !== undefined && sessions[b.meal + 1]) {
    sessions[b.meal].end = Math.max(sessions[b.meal].start, b.start)
    sessions[b.meal + 1].start = Math.min(sessions[b.meal + 1].end, Math.max(b.end, sessions[b.meal].end))
  }
  const gapLabel = (i: number) => breaks.find(b => b.meal === i)?.label?.trim() || template.gaps[i] || 'Break'
  for (const b of breaks) if (b.meal === undefined && b.end > b.start) events.push({ kind: 'break', label: b.label?.trim() || '☕ Break', start: b.start, end: b.end })
  // Free stretches = sessions minus the interview events and your breaks.
  const stretches: { start: number; end: number; session: number }[] = []
  sessions.forEach((s, i) => {
    let t = s.start
    for (const e of events.filter(e => e.end > s.start && e.start < s.end).sort((a, b) => a.start - b.start)) {
      if (e.start > t) stretches.push({ start: t, end: e.start, session: i })
      t = Math.max(t, e.end)
    }
    if (t < s.end) stretches.push({ start: t, end: s.end, session: i })
  })
  const rows: TimelineRow[] = [...events]
  // The gaps between sessions (lunch, dinner) — unless an event covers them.
  sessions.slice(1).forEach((s, i) => {
    const gap = { start: sessions[i].end, end: s.start }
    if (gap.end > gap.start && !events.some(e => e.start < gap.end && e.end > gap.start)) rows.push({ kind: 'meal', label: gapLabel(i), start: gap.start, end: gap.end })
  })
  // The night slot opens the last session, if that session has room for it;
  // otherwise (say an interview takes the session) it flows like any item.
  const lastSession = sessions.length - 1
  const nightItem = items.find(b => b.key === NIGHT_SLOT)
  let held = nightItem && stretches.some(st => st.session === lastSession && st.end - st.start >= nightItem.minutes) ? nightItem : null
  const queue = items.filter(b => b !== held)
  for (const st of stretches) {
    let t = st.start
    const place = (b: PrepBlock) => {
      rows.push({ kind: 'block', label: b.label, start: t, end: t + b.minutes, blockKey: b.key, done: b.done })
      t += b.minutes
    }
    if (held && st.session === lastSession && t + held.minutes <= st.end) { place(held); held = null }
    // The first item in order that still fits, so a short item fills a gap
    // a longer one can't (the order moves only as much as needed).
    for (let i = queue.findIndex(b => t + b.minutes <= st.end); i >= 0; i = queue.findIndex(b => t + b.minutes <= st.end)) {
      place(queue.splice(i, 1)[0])
    }
    if (st.end - t >= MIN_FLEX) rows.push({ kind: 'flex', label: FLEX_LABEL, start: t, end: st.end })
  }
  rows.sort((a, b) => a.start - b.start)
  return { rows, dropped: queue }
}

// ---------------- Edit today: a patch, not the whole day ----------------

// Only what changed in Edit today. Absent fields are untouched; `order` is
// sent only when slots were moved (the full key order after the edit).
export interface TodayPatch {
  startMin?: number
  interview?: Interview | null
  breaks?: DayBreak[]
  remove?: string[]
  add?: { key: string; minutes: number; label?: string }[]
  minutes?: Record<string, number>
  labels?: Record<string, string>
  order?: string[]
}
export const patchTouchesBlocks = (p: TodayPatch) => !!(p.remove?.length || p.add?.length || (p.minutes && Object.keys(p.minutes).length) || (p.labels && Object.keys(p.labels).length) || p.order)

// Applies a patch to today's items — the same on the page (optimistic) and
// on the server. Removed go, minutes / names change in place (the mock keeps
// its format's minutes), added are built like the recommended plan's and
// appended, then `order` (if any) sets the order.
export function applyTodayPatch(blocks: PrepBlock[], patch: TodayPatch, date: string): PrepBlock[] {
  let out = blocks.filter(b => !patch.remove?.includes(b.key))
  out = out.map(b => ({
    ...b,
    ...(patch.minutes?.[b.key] !== undefined && b.key !== 'mock' ? { minutes: patch.minutes[b.key] } : {}),
    ...(patch.labels?.[b.key]?.trim() && b.key.startsWith('custom:') ? { label: patch.labels[b.key].trim() } : {}),
  }))
  for (const a of patch.add ?? []) {
    if (out.some(b => b.key === a.key)) continue
    const b = blockFor(a.key, a.minutes, date, { coverage: [] }, a.label)
    // The minutes you set (a split half can be under a question's minutes).
    if (b) out.push(b.key === 'mock' ? b : { ...b, minutes: a.minutes })
  }
  if (patch.order) {
    const at = (k: string) => { const i = patch.order!.indexOf(k); return i < 0 ? Infinity : i }
    out = [...out].sort((a, b) => at(a.key) - at(b.key))
  }
  return out
}
