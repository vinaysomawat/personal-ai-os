import { toISTDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'
import { buildBlock, learnBlock, themeFor } from './roadmap'

// Interview War Mode — a deterministic full-day plan sized to the daily load
// level (Light 4h · Steady 6h · Intense 8h), built around the week's theme:
// Learn → Build → a themed drill on what you're building → (mock, 3 days a
// week) → one frontend upkeep category → STAR stories. Question quotas are
// what fits in each block's minutes at the category's time per question.

export type BankCategory = 'interview' | 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm' | 'backend' | 'code-review' | 'resume' | 'architecture' | 'ai-engineering'

// Question Bank categories and the minutes one question takes.
export const BANK_CATEGORIES: { key: BankCategory; label: string; minutesPerQ: number }[] = [
  // Questions real interviewers asked (v4.0 §4.1) — their own "redo" block
  // while any is rated under 7.
  { key: 'interview', label: 'Asked in interviews', minutesPerQ: 10 },
  // Machine coding: build a component from scratch, timed (the #1 round at
  // Indian product companies).
  { key: 'ui-coding', label: 'UI coding', minutesPerQ: 45 },
  { key: 'system-design', label: 'System design', minutesPerQ: 60 },
  { key: 'quiz', label: 'Theory', minutesPerQ: 5 },
  // Full-stack "product engineer" loops: API design, Node/Next server, auth,
  // data, caching, AI backend.
  { key: 'backend', label: 'Backend & APIs', minutesPerQ: 8 },
  { key: 'javascript-functions', label: 'JS functions', minutesPerQ: 25 },
  // Answer from real experience + AI interviewer feedback.
  { key: 'ai-native', label: 'AI-native', minutesPerQ: 10 },
  { key: 'algorithm', label: 'Algorithms', minutesPerQ: 30 },
  // Senior / lead Angular roles (banks, fintech, GCCs).
  { key: 'angular', label: 'Angular', minutesPerQ: 6 },
  // General/fit questions (tell me about yourself, the layoff, salary…).
  { key: 'behavioral', label: 'Behavioral Q&A', minutesPerQ: 10 },
  // Review an AI-generated PR: find the planted issues, rank them, fix them.
  { key: 'code-review', label: 'Code review', minutesPerQ: 15 },
  // Deep-dive on my own resume claims (projects, numbers, decisions) — what
  // hiring-manager and onsite rounds probe.
  { key: 'resume', label: 'From my resume', minutesPerQ: 8 },
  // Senior / Lead / Staff / Architect loops: rendering strategy, bundling,
  // monorepos, micro-frontends, platform, security, design systems, leading.
  { key: 'architecture', label: 'FE architecture & lead', minutesPerQ: 8 },
  // AI product / full-stack AI engineer loops: LLMs, embeddings, vector DBs,
  // RAG, agentic RAG, agents, human-in-the-loop, evals, MCP & A2A, AI product UX.
  { key: 'ai-engineering', label: 'AI engineering', minutesPerQ: 8 },
]
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

// A category's coverage plus today's quota (0 when no block plans it).
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

// Frontend upkeep: one of these a day, the weakest not used in the last
// three days (and not the one today's mock already practises).
export const UPKEEP_CATEGORIES: BankCategory[] = ['quiz', 'javascript-functions', 'ui-coding', 'system-design', 'architecture', 'code-review', 'ai-native', 'algorithm']
const MOCK_PRACTISES: Record<string, BankCategory> = { 'machine-coding': 'ui-coding', 'system-design': 'system-design' }
export function pickUpkeep(gaps: Record<string, number>, recent: string[], mockFormat: string | null): BankCategory {
  const allowed = UPKEEP_CATEGORIES.filter(c => c !== (mockFormat ? MOCK_PRACTISES[mockFormat] : undefined))
  const fresh = allowed.filter(c => !recent.includes(c))
  // Stable sort keeps list order on ties.
  return [...(fresh.length ? fresh : allowed)].sort((a, b) => (gaps[b] ?? 0) - (gaps[a] ?? 0))[0]
}
// Question time after the fixed blocks: 60% themed drill, 40% upkeep.
export const DRILL_SHARE = 0.6

function bankDetail(key: BankCategory, quota: number, focusTopic: string | null | undefined): string {
  const cat = BANK_CATEGORIES.find(c => c.key === key)!
  const s = quota === 1 ? '' : 's'
  switch (key) {
    case 'quiz': return `Answer ${quota} theory questions out loud, type the gist, get the AI rating${focusTopic ? ` — focus: ${focusTopic}` : ''}`
    case 'ai-native': return `Answer ${quota} AI-native question${s} from real experience, get the AI rating, tighten the answer`
    case 'ui-coding': return `Machine coding: build ${quota} component${s} from scratch in your editor, timed — working, keyboard + ARIA, then summarize the trade-offs`
    case 'system-design': return `Design ${quota} frontend system${s} end to end (Requirements → Architecture → Data → Interface → Optimizations), out loud, then get the AI rating`
    case 'backend': return `Answer ${quota} backend & API question${s} out loud, get the AI rating`
    case 'resume': return `Answer ${quota} resume deep-dive question${s} out loud from your real work — the decision, the trade-off, the number`
    case 'architecture': return `Answer ${quota} architecture & lead question${s} out loud (rendering strategy, bundling, monorepo, micro-frontends, platform, leading teams) — the options, the trade-off, your call`
    case 'ai-engineering': return `Answer ${quota} AI-engineering question${s} out loud — the pipeline, the trade-off, how you'd evaluate it`
    case 'code-review': return `Review ${quota} AI-generated PR${s}: find the planted issues, rank them by severity, give the fix`
    case 'javascript-functions': return `Implement ${quota} JS function${s} without looking anything up (polyfills, debounce, promise utilities), handle edge cases`
    default: return `Solve ${quota} ${cat.label.toLowerCase()} problem${s} (medium, pattern-first), talking through complexity`
  }
}

function bankBlock(c: CategoryCoverage, minutes: number, opts: { label?: string; prefix?: string; topic?: string; focusTopic?: string | null; gap: number }): PrepBlock {
  const cat = BANK_CATEGORIES.find(x => x.key === c.key)!
  const quota = Math.max(1, Math.floor(minutes / cat.minutesPerQ))
  const redo = Math.min(c.redoDue, redoSlots(quota))
  return {
    key: `bank:${c.key}`, label: `${opts.label ?? cat.label} × ${quota}`, minutes: quota * cat.minutesPerQ,
    detail: `${opts.prefix ?? ''}${bankDetail(c.key, quota, opts.focusTopic)}${redo ? ` — the first ${redo} redo your weak answers` : ''} (${Math.round((1 - opts.gap) * 100)}% of gate)`,
    href: `/prep?tab=questions&cat=${c.key}${opts.topic ? `&topic=${encodeURIComponent(opts.topic)}` : ''}`, done: c.doneToday >= quota,
  }
}

export function buildHuntPlan(ctx: {
  hoursPerDay: number
  date: string
  coverage: CategoryCoverage[]
  uncoveredCompetency: string | null
  // 0–1 readiness gap per category (war.ts) — picks the upkeep category.
  gaps?: Record<string, number>
  // Weakest theory topic, named in the Theory block.
  focusTopic?: string | null
  mockDoneToday?: boolean
  // Interview-category questions rated under 7 (§4.1) — lead the day.
  interviewRedo?: number
  // Bank categories planned in the last three days' sessions (upkeep rotation).
  recentCategories?: string[]
  // prep_settings.rest_day: that weekday's plan is empty.
  restDay: number
}): { focus: string; blocks: PrepBlock[] } {
  if (isRestDay(ctx.date, ctx.restDay)) return { focus: 'Rest day', blocks: [] }
  const dayMinutes = ctx.hoursPerDay * 60
  const format = mockFormatForDay(ctx.date)
  const gap = (key: string) => ctx.gaps?.[key] ?? 0
  const cov = (key: BankCategory) => ctx.coverage.find(c => c.key === key)!
  const redo = interviewRedoBlock(ctx.interviewRedo ?? 0)
  const learn = learnBlock(ctx.date, ctx.hoursPerDay)
  const build = buildBlock(ctx.date, ctx.hoursPerDay)
  const mock: PrepBlock | null = format ? {
    key: 'mock', label: `Mock round · ${formatOf(format).label}`, minutes: formatMinutes(format),
    detail: 'Timed, no notes. Run the one-click AI review after.',
    href: `/prep?tab=mock&format=${format}`, done: !!ctx.mockDoneToday,
  } : null
  const stories: PrepBlock = {
    key: 'lead', label: 'STAR stories', minutes: leadMinutes(dayMinutes, !!ctx.uncoveredCompetency),
    detail: ctx.uncoveredCompetency ? `Write a STAR story for "${ctx.uncoveredCompetency}", then rehearse one out loud` : 'Rehearse 2 stories out loud and get feedback on one',
    href: '/prep?tab=stories', done: false,
  }
  // Question time = the day minus the fixed blocks (at least an hour).
  const fixed = [redo, learn, build, mock, stories].reduce((s, b) => s + (b?.minutes ?? 0), 0)
  const questionMinutes = Math.max(60, dayMinutes - fixed)
  const theme = themeFor(ctx.date)
  const drill = bankBlock(cov(theme.category), Math.round(questionMinutes * DRILL_SHARE), {
    label: theme.topics.length ? `Theme: ${theme.topics.join(' + ')}` : undefined,
    prefix: theme.topics.length ? `This week's theme (${theme.topics.join(', ')}) — ` : "This week's theme — ",
    topic: theme.topics[0], gap: gap(theme.category),
  })
  const upkeepKey = pickUpkeep(ctx.gaps ?? {}, ctx.recentCategories ?? [], format)
  const upkeep = bankBlock(cov(upkeepKey), questionMinutes - Math.round(questionMinutes * DRILL_SHARE), {
    prefix: 'Frontend upkeep — ', focusTopic: ctx.focusTopic, gap: gap(upkeepKey),
  })
  // Redo real interview questions → Learn → Build → themed drill → mock → upkeep → STAR stories.
  const blocks = [redo, learn, build, drill, mock, upkeep, stories].filter((b): b is PrepBlock => !!b)
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
