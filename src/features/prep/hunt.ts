import type { PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'

// Interview War Mode — a deterministic full-day plan sized to the daily load
// level (Light 4h · Steady 6h · Intense 8h · Max 12h). Each question category
// gets a share of the day and a per-question time cost; its quota is what
// fits in that time.

export type BankCategory = 'interview' | 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm' | 'backend' | 'code-review' | 'resume'

// Base shares for a broad 2026 search (big tech, Indian product companies,
// startups, AI companies, services, remote) — relative weights; computeQuotas
// scales them to the day's bank minutes after the 0.5 + gap multiplier.
export const BANK_CATEGORIES: { key: BankCategory; label: string; share: number; minutesPerQ: number }[] = [
  // Questions real interviewers asked (v4.0 §4.1) — no quota share; they get
  // their own "redo" block while any is rated under 7.
  { key: 'interview', label: 'Asked in interviews', share: 0, minutesPerQ: 10 },
  // Machine coding: build a component from scratch, timed (the #1 round at
  // Indian product companies).
  { key: 'ui-coding', label: 'UI coding', share: 0.18, minutesPerQ: 45 },
  { key: 'system-design', label: 'System design', share: 0.13, minutesPerQ: 60 },
  { key: 'quiz', label: 'Theory', share: 0.12, minutesPerQ: 5 },
  // Full-stack "product engineer" loops: API design, Node/Next server, auth,
  // data, caching, AI backend.
  { key: 'backend', label: 'Backend & APIs', share: 0.12, minutesPerQ: 8 },
  { key: 'javascript-functions', label: 'JS functions', share: 0.10, minutesPerQ: 25 },
  // Answer from real experience + AI interviewer feedback.
  { key: 'ai-native', label: 'AI-native', share: 0.09, minutesPerQ: 10 },
  { key: 'algorithm', label: 'Algorithms', share: 0.09, minutesPerQ: 30 },
  // Senior / lead Angular roles (banks, fintech, GCCs).
  { key: 'angular', label: 'Angular', share: 0.06, minutesPerQ: 6 },
  // General/fit questions (tell me about yourself, the layoff, salary…).
  { key: 'behavioral', label: 'Behavioral Q&A', share: 0.06, minutesPerQ: 10 },
  // Review an AI-generated PR: find the planted issues, rank them, fix them.
  { key: 'code-review', label: 'Code review', share: 0.05, minutesPerQ: 15 },
  // Deep-dive on my own resume claims (projects, numbers, decisions) — what
  // hiring-manager and onsite rounds probe.
  { key: 'resume', label: 'From my resume', share: 0.08, minutesPerQ: 8 },
]
// The day = the Mock Round (its format's minutes) + STAR stories + the
// Question Bank blocks, which get whatever is left (2026-10-09 — they used to
// take a fixed 89% on top of the mock, overrunning the day). The
// Applications block was removed 2026-10-08 (applying happens outside).
// STAR stories get 12% of the day while any competency has no solid story
// (writing them is the job), 6% once all are covered.
export const leadMinutes = (dayMinutes: number, storiesMissing: boolean) => Math.round(dayMinutes * (storiesMissing ? 0.12 : 0.06))

export interface CategoryCoverage {
  key: BankCategory
  label: string
  total: number
  seen: number
  doneToday: number
}

export interface CategoryQuota extends CategoryCoverage {
  quota: number
  minutes: number
}

// Daily load level (prep_settings.hours_per_day): sizes the day's plan —
// quotas, blocks and the STAR-story share. Pace is judged against the plan.
export const LEVELS = [
  { key: 'light', label: 'Light', hours: 4 },
  { key: 'steady', label: 'Steady', hours: 6 },
  { key: 'intense', label: 'Intense', hours: 8 },
  { key: 'max', label: 'Max', hours: 12 },
] as const
export type Level = typeof LEVELS[number]
// The level for a stored hours value (nearest; older rows may hold any 1–14).
export const levelOf = (hours: number): Level =>
  LEVELS.reduce((best, l) => Math.abs(l.hours - hours) < Math.abs(best.hours - hours) ? l : best, LEVELS[2] as Level)

// Quotas are sized by time (the level's hours); re-answering weak questions
// counts too. Each category's share is scaled by its readiness gap (weights from war.ts's categoryWeights) and
// renormalized, so weak areas get more of the same day.
export function computeQuotas(coverage: CategoryCoverage[], hoursPerDay: number, weights: Record<string, number> = {}, reservedMinutes = 0): CategoryQuota[] {
  const bankMinutes = Math.max(60, hoursPerDay * 60 - reservedMinutes)
  const weightedTotal = BANK_CATEGORIES.reduce((s, c) => s + c.share * (weights[c.key] ?? 1), 0)
  const rows = BANK_CATEGORIES.map(cat => {
    const share = (cat.share * (weights[cat.key] ?? 1)) / weightedTotal
    // Every category gets at least one question from Steady (6h) up; on a
    // Light day the ones whose share can't fit a single question drop out.
    const quota = cat.share === 0 ? 0 : Math.max(hoursPerDay >= 6 ? 1 : 0, Math.floor((bankMinutes * share) / cat.minutesPerQ))
    return { cat, share, quota }
  })
  // Flooring leaves minutes unspent: hand them out one question at a time to
  // the category furthest below its share that still fits.
  let left = bankMinutes - rows.reduce((s, r) => s + r.quota * r.cat.minutesPerQ, 0)
  for (;;) {
    const next = rows.filter(r => r.share > 0 && r.cat.minutesPerQ <= left)
      .sort((a, b) => (a.quota * a.cat.minutesPerQ) / (a.share * bankMinutes) - (b.quota * b.cat.minutesPerQ) / (b.share * bankMinutes))[0]
    if (!next) break
    next.quota++
    left -= next.cat.minutesPerQ
  }
  return rows.map(({ cat, quota }) => ({ ...coverage.find(x => x.key === cat.key)!, quota, minutes: quota * cat.minutesPerQ }))
}

export function buildHuntPlan(ctx: {
  hoursPerDay: number
  date: string
  quotas: CategoryQuota[]
  uncoveredCompetency: string | null
  // 0–1 readiness gap per category (war.ts) — bank blocks run weakest first.
  gaps?: Record<string, number>
  // Weakest theory topic, named in the Theory block.
  focusTopic?: string | null
  mockDoneToday?: boolean
  // Interview-category questions rated under 7 (§4.1) — lead the day.
  interviewRedo?: number
  // A Company Prep block for a round ≤72h away (§4.4), placed first.
  companyBlock?: PrepBlock | null
}): { focus: string; blocks: PrepBlock[] } {
  const dayMinutes = ctx.hoursPerDay * 60
  const format = mockFormatForDay(ctx.date)
  const gap = (key: string) => ctx.gaps?.[key] ?? 0
  const pct = (key: string) => `${Math.round((1 - gap(key)) * 100)}% of gate`
  const bankBlocks: PrepBlock[] = [...ctx.quotas].filter(q => q.quota > 0)
    .sort((a, b) => gap(b.key) - gap(a.key))
    .map(q => {
      const cat = BANK_CATEGORIES.find(c => c.key === q.key)!
      const base = q.key === 'quiz'
        ? `Answer ${q.quota} theory questions out loud, type the gist, get the AI rating${ctx.focusTopic ? ` — focus: ${ctx.focusTopic}` : ''}`
        : q.key === 'ai-native'
        ? `Answer ${q.quota} AI-native questions from real experience, get the AI rating, tighten the answer`
        : q.key === 'behavioral'
        ? `Say ${q.quota} answer${q.quota === 1 ? '' : 's'} out loud (tell me about yourself, the layoff, salary…), get rated, tighten`
        : q.key === 'angular'
        ? `Answer ${q.quota} Angular questions out loud (signals, change detection, RxJS, architecture), get the AI rating, re-answer anything ≤6`
        : q.key === 'ui-coding'
        ? `Machine coding: build ${q.quota} component${q.quota === 1 ? '' : 's'} from scratch in your editor, timed — working, keyboard + ARIA, then summarize the trade-offs`
        : q.key === 'system-design'
        ? `Design ${q.quota} frontend system${q.quota === 1 ? '' : 's'} end to end (Requirements → Architecture → Data → Interface → Optimizations), out loud, then get the AI rating`
        : q.key === 'backend'
        ? `Answer ${q.quota} backend & API questions out loud (API design, auth, data, caching, AI backend), get the AI rating`
        : q.key === 'resume'
        ? `Answer ${q.quota} resume deep-dive question${q.quota === 1 ? '' : 's'} out loud from your real work — the decision, the trade-off, the number`
        : q.key === 'code-review'
        ? `Review ${q.quota} AI-generated PR${q.quota === 1 ? '' : 's'}: find the planted issues, rank them by severity, give the fix`
        : q.key === 'javascript-functions'
        ? `Implement ${q.quota} JS function${q.quota === 1 ? '' : 's'} without looking anything up (polyfills, debounce, promise utilities), handle edge cases`
        : `Solve ${q.quota} ${cat.label.toLowerCase()} problem${q.quota === 1 ? '' : 's'} (medium, pattern-first), talking through complexity`
      return {
        key: `bank:${q.key}`, label: `${cat.label} × ${q.quota}`, minutes: q.minutes,
        detail: `${base} (${pct(q.key)})`,
        href: `/prep?tab=questions&cat=${q.key}`, done: q.doneToday >= q.quota,
      }
    })
  const mock: PrepBlock = {
    key: 'mock', label: `Mock round · ${formatOf(format).label}`, minutes: formatMinutes(format),
    detail: 'Timed, no notes. Run the one-click AI review after.',
    href: `/prep?tab=mock&format=${format}`, done: !!ctx.mockDoneToday,
  }
  // Company prep (round ≤72h) → redo real interview questions → weakest two
  // areas → the mock round → the rest.
  const redo = interviewRedoBlock(ctx.interviewRedo ?? 0)
  const blocks: PrepBlock[] = [
    ...(ctx.companyBlock ? [ctx.companyBlock] : []),
    ...(redo ? [redo] : []),
    ...bankBlocks.slice(0, 2), mock, ...bankBlocks.slice(2),
  ]
  blocks.push({
    key: 'lead', label: 'STAR stories', minutes: leadMinutes(dayMinutes, !!ctx.uncoveredCompetency),
    detail: ctx.uncoveredCompetency ? `Write a STAR story for "${ctx.uncoveredCompetency}", then rehearse one out loud` : 'Rehearse 2 stories out loud and get feedback on one',
    href: '/prep?tab=stories', done: false,
  })
  return { focus: `Interview War Mode · ${levelOf(ctx.hoursPerDay).label}`, blocks }
}

// Company Prep Mode (v4.0 §4.4): a round ≤72h away puts a block first —
// 60 min when it's ≤24h away, else 40. Ticked manually or by finishing a
// focus session on it (no auto-tick).
export interface UpcomingRound {
  applicationId: string
  company: string
  kind: string
  scheduledAt: string
  priorityTopics: string[]
  priorQuestions: number
  // Company segment (career/pipeline.ts SEGMENTS) — picks the mock and topics.
  segment?: string
}
const MOCK_FOR_KIND: Record<string, string> = {
  system_design: 'system-design', coding: 'machine-coding', behavioral: 'behavioral', hiring_manager: 'behavioral',
}
// What each company segment's loops lean on (v4.1): the suggested mock and
// the Question Bank areas to drill. A round kind that names its own format
// (system design, coding, behavioral) still picks the mock.
const SEGMENT_PREP: Record<string, { mock: string; why: string; links: { label: string; href: string }[] }> = {
  big_tech: { mock: 'code-review', why: 'big tech: reviewing AI-generated code, algorithms, system design', links: [
    { label: 'Algorithms', href: '/prep?tab=questions&cat=algorithm' }, { label: 'System design', href: '/prep?tab=questions&cat=system-design' } ] },
  product_india: { mock: 'machine-coding', why: 'Indian product company: machine coding, web fundamentals, algorithms', links: [
    { label: 'Web fundamentals', href: '/prep?tab=questions&cat=quiz&topic=DOM%20%26%20Browser%20APIs' }, { label: 'Algorithms', href: '/prep?tab=questions&cat=algorithm' } ] },
  startup: { mock: 'system-design', why: 'startup: backend, full-stack system design, a project deep-dive story', links: [
    { label: 'Backend & APIs', href: '/prep?tab=questions&cat=backend' }, { label: 'Full-stack design', href: '/prep?tab=questions&cat=system-design&topic=Full-stack' }, { label: 'Deep-dive story', href: '/prep?tab=stories' } ] },
  ai_company: { mock: 'code-review', why: 'AI company: AI-native, streaming UI, AI backend', links: [
    { label: 'AI-native', href: '/prep?tab=questions&cat=ai-native' }, { label: 'Streaming UI', href: '/prep?tab=questions&cat=system-design&topic=AI' }, { label: 'AI backend', href: '/prep?tab=questions&cat=backend&topic=AI%20backend' } ] },
}
const DEFAULT_PREP = { mock: 'machine-coding', why: 'theory, machine coding, behavioral', links: [
  { label: 'Theory', href: '/prep?tab=questions&cat=quiz' }, { label: 'Behavioral Q&A', href: '/prep?tab=questions&cat=behavioral' } ] }

export function companyPrepBlock(r: UpcomingRound | null, nowMs: number, topicHref: (t: string) => string): PrepBlock | null {
  if (!r) return null
  const hours = (new Date(r.scheduledAt).getTime() - nowMs) / 3600_000
  if (hours < 0 || hours > 72) return null
  const when = new Date(r.scheduledAt).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  const kind = r.kind.replace(/_/g, ' ')
  const seg = SEGMENT_PREP[r.segment ?? 'other'] ?? DEFAULT_PREP
  const mock = MOCK_FOR_KIND[r.kind] ?? seg.mock
  const behavioral = r.kind === 'behavioral' || r.kind === 'hiring_manager' || r.kind === 'onsite'
  return {
    key: `company:${r.applicationId}`, label: `Prep for ${r.company} · ${kind} · ${when}`, minutes: hours <= 24 ? 60 : 40,
    detail: [
      r.priorityTopics.length ? `JD priority topics: ${r.priorityTopics.join(', ')}` : 'No JD analysis yet — run it on the Interviews page',
      `focus for a ${seg.why}`,
      r.priorQuestions ? `redo the ${r.priorQuestions} question${r.priorQuestions === 1 ? '' : 's'} they asked before` : null,
      `then a ${mock.replace('-', ' ')} mock`,
    ].filter(Boolean).join(' · '),
    href: '/interviews', done: false,
    links: [
      ...r.priorityTopics.slice(0, 3).map(t => ({ label: t, href: topicHref(t) })),
      ...seg.links.filter(l => !r.priorityTopics.includes(l.label)),
      { label: 'Mock round', href: `/prep?tab=mock&format=${mock}` },
      ...(behavioral && !seg.links.some(l => l.href === '/prep?tab=stories') ? [{ label: 'Story Bank', href: '/prep?tab=stories' }] : []),
      { label: `${r.company} page`, href: '/interviews' },
    ],
  }
}

// "Redo real interview questions × N": 10 min each, at most 4 a day.
export const INTERVIEW_REDO_MAX = 4
export function interviewRedoBlock(lowRated: number): PrepBlock | null {
  const n = Math.min(INTERVIEW_REDO_MAX, lowRated)
  if (n === 0) return null
  return {
    key: 'bank:interview', label: `Redo real interview questions × ${n}`, minutes: n * 10,
    detail: 'Questions real interviewers asked you that went badly or ok — answer them again out loud, get the AI rating, aim for 7+',
    href: '/prep?tab=questions&cat=interview', done: false,
  }
}

// Interview War Mode is always on (there is no target date to switch it off
// since v4.0.8). Kept as the one shared check for everything that pauses or
// changes while hunting, so turning it back into a setting is one place.
export async function isHuntMode(): Promise<boolean> {
  return true
}
