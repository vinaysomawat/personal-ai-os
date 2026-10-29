import { BANK_CATEGORIES, bankBlock, type BankCategory, type CategoryCoverage } from './hunt'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'
import { buildBlock, learnBlock, themeFor, type RoadmapStepDone } from './roadmap'
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
  'learn', 'build', 'bank:architecture', 'mock', 'bank:ai-engineering',
  'bank:backend', 'apply', 'bank:ai-native', 'bank:angular', 'bank:behavioral', 'bank:resume',
] as const
export type PlanKey = typeof ORDER[number]
export const PLAN_LABEL: Record<PlanKey, string> = {
  ...Object.fromEntries(BANK_CATEGORIES.map(c => [`bank:${c.key}`, c.label])) as Record<string, string>,
  learn: 'Learn (roadmap week)', build: 'Build (roadmap week)', mock: 'Mock round (scheduled)', 'bank:ai-engineering': 'AI engineering (week theme)', apply: '💼 Job applications',
} as Record<PlanKey, string>

// The default day (≈ 590 min + the mock on its days): the senior core,
// AI engineering, job applications and the smaller categories.
const DEFAULT_MINUTES: Partial<Record<PlanKey, number>> = {
  'bank:algorithm': 30, 'bank:javascript-functions': 30, 'bank:quiz': 30,
  'bank:system-design': 60, 'bank:ui-coding': 45, 'bank:code-review': 30,
  learn: 20, build: 90, 'bank:architecture': 30, mock: 1, 'bank:ai-engineering': 45,
  'bank:backend': 45, apply: 30, 'bank:ai-native': 30, 'bank:angular': 30, 'bank:behavioral': 15, 'bank:resume': 30,
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

// One plan item: a question block (redo guide and gap from coverage; AI
// engineering follows the roadmap week's theme), Learn / Build (the roadmap
// week), the day's scheduled mock, or your own slot (`custom:<id>`, its label
// given). null when it has nothing that day (no roadmap week, no mock).
export function blockFor(key: string, minutes: number, date: string, ctx: PlanCtx, customLabel?: string): PrepBlock | null {
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
  const theme = themeFor(date)
  if (cat === 'ai-engineering' && theme.category !== 'backend') {
    return bankBlock(cov(theme.category), minutes, {
      label: theme.topics.length ? `Theme: ${theme.topics.join(' + ')}` : undefined,
      prefix: theme.topics.length ? `This week's theme (${theme.topics.join(', ')}) — ` : "This week's theme — ",
      topic: theme.topics[0], gap: gap(theme.category),
    })
  }
  const backendTheme = cat === 'backend' && theme.category === 'backend'
  return bankBlock(cov(cat), minutes, {
    label: backendTheme && theme.topics.length ? `Backend: ${theme.topics.join(' + ')}` : undefined,
    prefix: backendTheme && theme.topics.length ? `This week's theme (${theme.topics.join(', ')}) — ` : '',
    topic: backendTheme ? theme.topics[0] : undefined,
    focusTopic: cat === 'quiz' ? ctx.focusTopic : null, gap: gap(cat),
  })
}

// The recommended plan for a date: the template's keys in ORDER with their
// minutes, the mock only on its scheduled days (a backend-themed roadmap
// week folds AI engineering into Backend).
export function planItems(date: string, template: DayTemplate, ctx: PlanCtx): PrepBlock[] {
  const minutes = template.minutes
  const backendWeek = themeFor(date).category === 'backend'
  const out: PrepBlock[] = []
  for (const key of ORDER) {
    let m = minutes[key] ?? 0
    if (m <= 0 || (key === 'bank:ai-engineering' && backendWeek)) continue
    if (key === 'bank:backend' && backendWeek) m += minutes['bank:ai-engineering'] ?? 0
    const b = blockFor(key, m, date, ctx)
    if (b) out.push(b)
  }
  // Least-covered categories first: the question blocks swap among their own
  // slots by coverage (practised / total, ascending; ties keep ORDER), so
  // Learn, Build, the mock and applications keep their place in the day.
  const pct = (b: PrepBlock) => { const c = ctx.coverage.find(x => `bank:${x.key}` === b.key); return c?.total ? c.seen / c.total : 1 }
  const slots = out.flatMap((b, i) => b.key.startsWith('bank:') ? [i] : [])
  const sorted = slots.map(i => out[i]).sort((a, b) => pct(a) - pct(b))
  slots.forEach((i, k) => { out[i] = sorted[k] })
  return out
}

// An interview prep's matched categories (jd.ts matchJD, strongest first)
// take the first question-block slots; open blocks only, everything else
// keeps its place.
export function frontLoad(blocks: PrepBlock[], categories: string[]): PrepBlock[] {
  const rank = (b: PrepBlock) => { const i = categories.indexOf(b.key.slice(5)); return i < 0 ? Infinity : i }
  const out = [...blocks]
  const slots = out.flatMap((b, i) => b.key.startsWith('bank:') && !b.done ? [i] : [])
  const sorted = slots.map(i => out[i]).sort((a, b) => { const d = rank(a) - rank(b); return Number.isNaN(d) ? 0 : d })
  slots.forEach((i, k) => { out[i] = sorted[k] })
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
  const queue = [...items]
  for (const st of stretches) {
    let t = st.start
    // The first item in order that still fits, so a short item fills a gap
    // a longer one can't (the order moves only as much as needed).
    for (let i = queue.findIndex(b => t + b.minutes <= st.end); i >= 0; i = queue.findIndex(b => t + b.minutes <= st.end)) {
      const b = queue.splice(i, 1)[0]
      rows.push({ kind: 'block', label: b.label, start: t, end: t + b.minutes, blockKey: b.key, done: b.done })
      t += b.minutes
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
    if (b) out.push(b)
  }
  if (patch.order) {
    const at = (k: string) => { const i = patch.order!.indexOf(k); return i < 0 ? Infinity : i }
    out = [...out].sort((a, b) => at(a.key) - at(b.key))
  }
  return out
}
