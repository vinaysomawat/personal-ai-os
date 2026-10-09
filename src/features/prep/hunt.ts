import type { SupabaseClient } from '@supabase/supabase-js'
import type { PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'

// Job Hunt Mode (ROADMAP-v2 §9) — deterministic full-day plan sized to the
// user's daily hours and days left before the target date. Each question
// category gets a share of the day and a per-question time cost; the daily
// quota is the smaller of "what fits in that time" and "what's needed to
// cover the remaining questions by the target date".

export type BankCategory = 'interview' | 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm'

// Base shares re-balanced 2026-10-09 to the current market (machine coding
// is the #1 round at Indian product companies, Angular is the fastest lane
// to offers, DSA still appears in most product loops); relative weights —
// computeQuotas scales them to the bank's minutes.
export const BANK_CATEGORIES: { key: BankCategory; label: string; share: number; minutesPerQ: number }[] = [
  // Questions real interviewers asked (v4.0 §4.1) — no quota share; they get
  // their own "redo" block while any is rated under 7.
  { key: 'interview', label: 'Asked in interviews', share: 0, minutesPerQ: 10 },
  { key: 'quiz', label: 'Theory', share: 0.14, minutesPerQ: 5 },
  // Track A: senior / lead Angular roles (banks, fintech, GCCs).
  { key: 'angular', label: 'Angular', share: 0.10, minutesPerQ: 6 },
  // Answer from real experience + AI interviewer feedback (Apollo JD bar).
  { key: 'ai-native', label: 'AI-native', share: 0.10, minutesPerQ: 10 },
  // General/fit questions (tell me about yourself, the layoff, salary…).
  { key: 'behavioral', label: 'Behavioral Q&A', share: 0.04, minutesPerQ: 10 },
  { key: 'javascript-functions', label: 'JS functions', share: 0.12, minutesPerQ: 25 },
  // Machine coding: build a component from scratch, timed.
  { key: 'ui-coding', label: 'UI coding', share: 0.20, minutesPerQ: 45 },
  { key: 'system-design', label: 'System design', share: 0.12, minutesPerQ: 60 },
  { key: 'algorithm', label: 'Algorithms', share: 0.06, minutesPerQ: 30 },
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
  projectedSeen: number
}

export function daysLeft(today: string, targetDate: string): number {
  const ms = new Date(`${targetDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()
  // Today counts as a prep day, so the target date itself is day 1 when equal.
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

// War Mode (2026-10-07): quotas are sized by time, not by "unseen ÷ days
// left" — the hours are fixed, re-answering weak questions counts, and the
// old cap left most of a long runway's day empty. Each category's share is
// scaled by its readiness gap (weights from war.ts's categoryWeights) and
// renormalized, so weak areas get more of the same day.
export function computeQuotas(coverage: CategoryCoverage[], hoursPerDay: number, days: number, weights: Record<string, number> = {}, reservedMinutes = 0): CategoryQuota[] {
  const bankMinutes = Math.max(60, hoursPerDay * 60 - reservedMinutes)
  const weightedTotal = BANK_CATEGORIES.reduce((s, c) => s + c.share * (weights[c.key] ?? 1), 0)
  return BANK_CATEGORIES.map(cat => {
    const c = coverage.find(x => x.key === cat.key)!
    const share = (cat.share * (weights[cat.key] ?? 1)) / weightedTotal
    const quota = cat.share === 0 ? 0 : Math.max(1, Math.floor((bankMinutes * share) / cat.minutesPerQ))
    return {
      ...c,
      quota,
      minutes: quota * cat.minutesPerQ,
      projectedSeen: Math.min(c.total, c.seen - c.doneToday + quota * days),
    }
  })
}

export function buildHuntPlan(ctx: {
  hoursPerDay: number
  days: number
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
  return { focus: `Job hunt · D-${ctx.days}`, blocks }
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
}
const MOCK_FOR_KIND: Record<string, string> = {
  system_design: 'system-design', coding: 'machine-coding', behavioral: 'behavioral', hiring_manager: 'behavioral',
}
export function companyPrepBlock(r: UpcomingRound | null, nowMs: number, topicHref: (t: string) => string): PrepBlock | null {
  if (!r) return null
  const hours = (new Date(r.scheduledAt).getTime() - nowMs) / 3600_000
  if (hours < 0 || hours > 72) return null
  const when = new Date(r.scheduledAt).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  const kind = r.kind.replace(/_/g, ' ')
  const mock = MOCK_FOR_KIND[r.kind] ?? 'screen'
  const behavioral = r.kind === 'behavioral' || r.kind === 'hiring_manager' || r.kind === 'onsite'
  return {
    key: `company:${r.applicationId}`, label: `Prep for ${r.company} · ${kind} · ${when}`, minutes: hours <= 24 ? 60 : 40,
    detail: [
      r.priorityTopics.length ? `JD priority topics: ${r.priorityTopics.join(', ')}` : 'No JD analysis yet — run it on the Interviews page',
      r.priorQuestions ? `redo the ${r.priorQuestions} question${r.priorQuestions === 1 ? '' : 's'} they asked before` : null,
      `then a ${mock.replace('-', ' ')} mock`,
    ].filter(Boolean).join(' · '),
    href: '/interviews', done: false,
    links: [
      ...r.priorityTopics.slice(0, 4).map(t => ({ label: t, href: topicHref(t) })),
      { label: 'Mock round', href: `/prep?tab=mock&format=${mock}` },
      ...(behavioral ? [{ label: 'Story Bank', href: '/prep?tab=stories' }] : []),
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

// Job Hunt Mode = a target date is set (prep_settings.target_date). The one
// shared check for everything that pauses or changes while hunting.
export async function isHuntMode(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from('prep_settings').select('target_date').eq('user_id', userId).maybeSingle()
  return !!data?.target_date
}
