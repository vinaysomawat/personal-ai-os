import { BANK_CATEGORIES, bankBlock, type BankCategory, type CategoryCoverage } from './hunt'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'
import { buildBlock, learnBlock, themeFor } from './roadmap'
import type { TimelineRow } from './timeline'
import type { PrepBlock } from './types'

// The day (v4.5) — deterministic, client-safe. A day template (your
// sessions, the gaps between them, breaks, and minutes per category for each
// weekday) gives the recommended plan; layoutDay() puts it on the clock.
// Times are prep minutes (after IST midnight, past 1440 after midnight; the
// Prep day rolls over at 4am — see lib/date prepToday).

export interface DaySession { label: string; start: number; end: number }
export interface DayTemplate {
  // The first session's start is the day's start (prep_settings.day_start_min
  // or today's own start) — only it moves; the rest are fixed.
  sessions: DaySession[]
  // Labels for the gaps between sessions, in order.
  gaps: string[]
  // A break of breakMinutes at the first block boundary after breakEvery
  // minutes of continuous work.
  breakMinutes: number
  breakEvery: number
  // Sunday first: plan key → minutes (absent / 0 = not that day). For 'mock'
  // any value > 0 means "today's scheduled mock" (its format sets the time).
  weekly: Record<string, number>[]
}

// Plan keys in day order: quick, sharp work first (morning), deep work at the
// library, lighter spoken work late. It is also the drop order on a short
// day: the later a key, the sooner it gives way.
export const ORDER = [
  'bank:algorithm', 'bank:javascript-functions', 'bank:quiz',
  'bank:system-design', 'bank:ui-coding', 'bank:code-review',
  'learn', 'build', 'bank:architecture', 'mock', 'bank:ai-engineering',
  'bank:backend', 'bank:ai-native', 'bank:behavioral', 'bank:resume',
] as const
export type PlanKey = typeof ORDER[number]
export const PLAN_LABEL: Record<PlanKey, string> = {
  ...Object.fromEntries(BANK_CATEGORIES.map(c => [`bank:${c.key}`, c.label])) as Record<string, string>,
  learn: 'Learn (roadmap week)', build: 'Build (roadmap week)', mock: 'Mock round (scheduled)', 'bank:ai-engineering': 'AI engineering (week theme)',
} as Record<PlanKey, string>

// The senior core, every day (≈ 470 min), plus rotating categories.
const CORE: Partial<Record<PlanKey, number>> = {
  'bank:system-design': 60, 'bank:ui-coding': 60, 'bank:algorithm': 45, 'bank:javascript-functions': 45,
  'bank:code-review': 30, 'bank:quiz': 30, learn: 20, build: 90, 'bank:ai-engineering': 45, 'bank:backend': 45,
}
const day = (extra: Partial<Record<PlanKey, number>>) => ({ ...CORE, ...extra }) as Record<string, number>
// Sun: FE architecture + a frontend screen mock · Mon/Wed/Fri: FE architecture
// + Behavioral Q&A · Tue/Thu/Sat: AI-native + resume deep-dives + the mock.
export const DEFAULT_TEMPLATE: DayTemplate = {
  sessions: [
    { label: 'Morning', start: 11 * 60, end: 13 * 60 },
    { label: 'Library', start: 14 * 60 + 30, end: 21 * 60 + 30 },
    { label: 'Late', start: 22 * 60 + 30, end: 24 * 60 + 30 },
  ],
  gaps: ['🍽️ Lunch', '🍽️ Dinner + walk'],
  breakMinutes: 20,
  breakEvery: 150,
  weekly: [
    day({ 'bank:architecture': 45, mock: 1 }),
    day({ 'bank:architecture': 45, 'bank:behavioral': 30 }),
    day({ 'bank:ai-native': 30, 'bank:resume': 30, mock: 1 }),
    day({ 'bank:architecture': 45, 'bank:behavioral': 30 }),
    day({ 'bank:ai-native': 30, 'bank:resume': 30, mock: 1 }),
    day({ 'bank:architecture': 45, 'bank:behavioral': 30 }),
    day({ 'bank:ai-native': 30, 'bank:resume': 30, mock: 1 }),
  ],
}

// A stored template over the defaults (missing pieces fall back).
export function templateOf(stored: Partial<DayTemplate> | null | undefined): DayTemplate {
  const t = { ...DEFAULT_TEMPLATE, ...(stored ?? {}) }
  return { ...t, weekly: Array.from({ length: 7 }, (_, i) => t.weekly?.[i] ?? DEFAULT_TEMPLATE.weekly[i]) }
}

export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

export interface PlanCtx {
  coverage: CategoryCoverage[]
  gaps?: Record<string, number>
  focusTopic?: string | null
  mockDoneToday?: boolean
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
  if (key === 'learn') return learnBlock(date, minutes)
  if (key === 'build') return buildBlock(date, minutes)
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

// The recommended plan for a date: the weekday's keys in ORDER with their
// minutes (a backend-themed roadmap week folds AI engineering into Backend).
export function planItems(date: string, template: DayTemplate, ctx: PlanCtx): PrepBlock[] {
  const minutes = template.weekly[weekdayOf(date)] ?? {}
  const backendWeek = themeFor(date).category === 'backend'
  const out: PrepBlock[] = []
  for (const key of ORDER) {
    let m = minutes[key] ?? 0
    if (m <= 0 || (key === 'bank:ai-engineering' && backendWeek)) continue
    if (key === 'bank:backend' && backendWeek) m += minutes['bank:ai-engineering'] ?? 0
    const b = blockFor(key, m, date, ctx)
    if (b) out.push(b)
  }
  return out
}

// Interview today (prep_sessions.interview): a warm-up before, a debrief
// after. Before the day's start it moves the start earlier (gym skipped).
export interface Interview { start: number; minutes: number; label?: string }
export const WARMUP_MINUTES = 30
export const DEBRIEF_MINUTES = 15
const FLEX_LABEL = 'Flex — finish any open block, or redo weak answers'
const MIN_FLEX = 10

// Lays the day's items (in their order) into the sessions, around an
// interview: each item goes into the current free stretch if it fits, else
// the next one (order kept); a break goes in at the first block boundary
// after breakEvery minutes of work; leftover time in a stretch is Flex.
// Items that fit nowhere come back as `dropped`.
export function layoutDay(items: PrepBlock[], template: DayTemplate, dayStart: number, interview: Interview | null): { rows: TimelineRow[]; dropped: PrepBlock[] } {
  const sessions = template.sessions.map(s => ({ ...s }))
  if (sessions.length) sessions[0].start = Math.min(dayStart, sessions[0].end)
  const events: TimelineRow[] = interview ? [
    { kind: 'warmup', label: 'Warm-up — stories, notes, the company', start: interview.start - WARMUP_MINUTES, end: interview.start },
    { kind: 'interview', label: interview.label?.trim() || 'Interview', start: interview.start, end: interview.start + interview.minutes },
    { kind: 'debrief', label: 'Debrief — write down every question', start: interview.start + interview.minutes, end: interview.start + interview.minutes + DEBRIEF_MINUTES },
  ] : []
  if (interview && sessions.length && events[0].start < sessions[0].start) sessions[0].start = events[0].start
  // Free stretches = sessions minus the interview events.
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
    if (gap.end > gap.start && !events.some(e => e.start < gap.end && e.end > gap.start)) rows.push({ kind: 'meal', label: template.gaps[i] ?? 'Break', start: gap.start, end: gap.end })
  })
  const queue = [...items]
  let worked = 0, lastSession = -1
  for (const st of stretches) {
    if (st.session !== lastSession) { worked = 0; lastSession = st.session }
    let t = st.start
    while (queue.length && t + queue[0].minutes <= st.end) {
      const b = queue.shift()!
      rows.push({ kind: 'block', label: b.label, start: t, end: t + b.minutes, blockKey: b.key, done: b.done })
      t += b.minutes
      worked += b.minutes
      if (worked >= template.breakEvery && queue.length && t + template.breakMinutes + queue[0].minutes <= st.end) {
        rows.push({ kind: 'break', label: '☕ Break', start: t, end: t + template.breakMinutes })
        t += template.breakMinutes
        worked = 0
      }
    }
    if (st.end - t >= MIN_FLEX) rows.push({ kind: 'flex', label: FLEX_LABEL, start: t, end: st.end })
  }
  rows.sort((a, b) => a.start - b.start)
  return { rows, dropped: queue }
}

// What a day's timeline needs, in one place (page, Telegram, Dashboard).
export const dayStartOf = (sessionStart: number | null | undefined, settingsStart: number) => sessionStart ?? settingsStart
