import { toISTDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'

// Interview War Mode — a deterministic full-day plan sized to the daily load
// level (Light 4h · Steady 6h · Intense 8h). Each question category
// gets a share of the day and a per-question time cost; its quota is what
// fits in that time.

export type BankCategory = 'interview' | 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm' | 'backend' | 'code-review' | 'resume' | 'architecture' | 'ai-engineering'

// Base shares for a Senior Frontend / AI Product Engineer search (AI
// engineering, backend and system design lead; UI coding, JS functions and
// algorithms keep a smaller share) — relative weights; computeQuotas
// scales them to the day's bank minutes after the 0.5 + gap multiplier.
export const BANK_CATEGORIES: { key: BankCategory; label: string; share: number; minutesPerQ: number }[] = [
  // Questions real interviewers asked (v4.0 §4.1) — no quota share; they get
  // their own "redo" block while any is rated under 7.
  { key: 'interview', label: 'Asked in interviews', share: 0, minutesPerQ: 10 },
  // Machine coding: build a component from scratch, timed (the #1 round at
  // Indian product companies).
  { key: 'ui-coding', label: 'UI coding', share: 0.13, minutesPerQ: 45 },
  { key: 'system-design', label: 'System design', share: 0.14, minutesPerQ: 60 },
  { key: 'quiz', label: 'Theory', share: 0.08, minutesPerQ: 5 },
  // Full-stack "product engineer" loops: API design, Node/Next server, auth,
  // data, caching, AI backend.
  { key: 'backend', label: 'Backend & APIs', share: 0.13, minutesPerQ: 8 },
  { key: 'javascript-functions', label: 'JS functions', share: 0.07, minutesPerQ: 25 },
  // Answer from real experience + AI interviewer feedback.
  { key: 'ai-native', label: 'AI-native', share: 0.09, minutesPerQ: 10 },
  { key: 'algorithm', label: 'Algorithms', share: 0.06, minutesPerQ: 30 },
  // Senior / lead Angular roles (banks, fintech, GCCs).
  { key: 'angular', label: 'Angular', share: 0, minutesPerQ: 6 },
  // General/fit questions (tell me about yourself, the layoff, salary…).
  { key: 'behavioral', label: 'Behavioral Q&A', share: 0.06, minutesPerQ: 10 },
  // Review an AI-generated PR: find the planted issues, rank them, fix them.
  { key: 'code-review', label: 'Code review', share: 0.06, minutesPerQ: 15 },
  // Deep-dive on my own resume claims (projects, numbers, decisions) — what
  // hiring-manager and onsite rounds probe.
  { key: 'resume', label: 'From my resume', share: 0.08, minutesPerQ: 8 },
  // Senior / Lead / Staff / Architect loops: rendering strategy, bundling,
  // monorepos, micro-frontends, platform, security, design systems, leading.
  { key: 'architecture', label: 'FE architecture & lead', share: 0.07, minutesPerQ: 8 },
  // AI product / full-stack AI engineer loops: LLMs, embeddings, vector DBs,
  // RAG, agentic RAG, agents, human-in-the-loop, evals, MCP & A2A, AI product UX.
  { key: 'ai-engineering', label: 'AI engineering', share: 0.14, minutesPerQ: 8 },
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
  // Weak answers due for a redo today (redoDue below).
  redoDue: number
}

export interface CategoryQuota extends CategoryCoverage {
  quota: number
  minutes: number
}

// Redo weak answers: a question whose latest rating is under 7 comes back
// 1 day (<5), 2 days (<6) or 4 days (<7) after that rating — the same gaps
// as the topic revision queue. Up to REDO_SHARE of a category's daily quota
// goes to these first; the rest is new questions. One answered today isn't
// due again today.
export const REDO_SHARE = 0.4
export const redoInterval = (rating: number) => rating < 5 ? 1 : rating < 6 ? 2 : 4
export const redoSlots = (quota: number) => Math.round(quota * REDO_SHARE)
export function isRedoDue(q: Pick<BankQuestion, 'last_rating' | 'last_rated_at' | 'last_seen_at'>, today: string): boolean {
  if (q.last_rating === null || q.last_rating >= 7 || !q.last_rated_at) return false
  if (q.last_seen_at && toISTDateStr(q.last_seen_at) === today) return false
  const d = new Date(`${toISTDateStr(q.last_rated_at)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + redoInterval(q.last_rating))
  return d.toISOString().slice(0, 10) <= today
}

// Daily load level (prep_settings.hours_per_day): sizes the day's plan —
// quotas, blocks and the STAR-story share. Pace is judged against the plan.
export const LEVELS = [
  { key: 'light', label: 'Light', hours: 4 },
  { key: 'steady', label: 'Steady', hours: 6 },
  { key: 'intense', label: 'Intense', hours: 8 },
] as const
export type Level = typeof LEVELS[number]
// Weekly rest day (prep_settings.rest_day, IST weekday 0 = Sunday): no plan,
// the streak carries over, no 1pm nudge, a short rest-day coach message.
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const isRestDay = (date: string, restDay: number) => new Date(`${date}T00:00:00Z`).getUTCDay() === restDay

// The level for a stored hours value (nearest; older rows may hold any 1–14,
// so a 12 from the removed Max level reads as Intense). Unset = Steady.
export const DEFAULT_HOURS = 6
export const levelOf = (hours: number): Level =>
  LEVELS.reduce((best, l) => Math.abs(l.hours - hours) < Math.abs(best.hours - hours) ? l : best, LEVELS[1] as Level)

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
  // This week's Build roadmap milestone (roadmap.ts), after the redo block.
  buildBlock?: PrepBlock | null
  // prep_settings.rest_day: that weekday's plan is empty.
  restDay: number
}): { focus: string; blocks: PrepBlock[] } {
  if (isRestDay(ctx.date, ctx.restDay)) return { focus: 'Rest day', blocks: [] }
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
        : q.key === 'architecture'
        ? `Answer ${q.quota} architecture & lead question${q.quota === 1 ? '' : 's'} out loud (rendering strategy, bundling, monorepo, micro-frontends, platform, leading teams) — the options, the trade-off, your call`
        : q.key === 'ai-engineering'
        ? `Answer ${q.quota} AI-engineering question${q.quota === 1 ? '' : 's'} out loud (RAG, agents, MCP & A2A, AI product UX, evals) — the pipeline, the trade-off, how you'd evaluate it`
        : q.key === 'code-review'
        ? `Review ${q.quota} AI-generated PR${q.quota === 1 ? '' : 's'}: find the planted issues, rank them by severity, give the fix`
        : q.key === 'javascript-functions'
        ? `Implement ${q.quota} JS function${q.quota === 1 ? '' : 's'} without looking anything up (polyfills, debounce, promise utilities), handle edge cases`
        : `Solve ${q.quota} ${cat.label.toLowerCase()} problem${q.quota === 1 ? '' : 's'} (medium, pattern-first), talking through complexity`
      const redo = Math.min(q.redoDue, redoSlots(q.quota))
      return {
        key: `bank:${q.key}`, label: `${cat.label} × ${q.quota}`, minutes: q.minutes,
        detail: `${base}${redo ? ` — the first ${redo} redo your weak answers` : ''} (${pct(q.key)})`,
        href: `/prep?tab=questions&cat=${q.key}`, done: q.doneToday >= q.quota,
      }
    })
  const mock: PrepBlock = {
    key: 'mock', label: `Mock round · ${formatOf(format).label}`, minutes: formatMinutes(format),
    detail: 'Timed, no notes. Run the one-click AI review after.',
    href: `/prep?tab=mock&format=${format}`, done: !!ctx.mockDoneToday,
  }
  // Redo real interview questions → Build milestone → weakest two areas → the mock round → the rest.
  const redo = interviewRedoBlock(ctx.interviewRedo ?? 0)
  const blocks: PrepBlock[] = [
    ...(redo ? [redo] : []),
    ...(ctx.buildBlock ? [ctx.buildBlock] : []),
    ...bankBlocks.slice(0, 2), mock, ...bankBlocks.slice(2),
  ]
  blocks.push({
    key: 'lead', label: 'STAR stories', minutes: leadMinutes(dayMinutes, !!ctx.uncoveredCompetency),
    detail: ctx.uncoveredCompetency ? `Write a STAR story for "${ctx.uncoveredCompetency}", then rehearse one out loud` : 'Rehearse 2 stories out loud and get feedback on one',
    href: '/prep?tab=stories', done: false,
  })
  return { focus: `Interview War Mode · ${levelOf(ctx.hoursPerDay).label}`, blocks }
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
