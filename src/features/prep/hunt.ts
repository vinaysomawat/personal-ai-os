import { toPrepDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'
import { buildBlock, learnBlock, themeFor } from './roadmap'

// Interview War Mode — a deterministic full-day plan sized to the daily load
// level (Light 4h · Steady 6h · Intense 8h), split 60% frontend · 28% AI ·
// 12% backend (DAY_SPLIT): three frontend blocks (coding, design, theory) →
// (mock, 3 days a week) → Learn → Build → a themed drill on what you're
// building → backend. Question quotas are what fits in each block's minutes
// at the category's time per question.

export type BankCategory = 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm' | 'backend' | 'code-review' | 'resume' | 'architecture' | 'ai-engineering'

// Question Bank categories and the minutes one question takes.
export const BANK_CATEGORIES: { key: BankCategory; label: string; minutesPerQ: number }[] = [
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
  if (q.last_seen_at && toPrepDateStr(q.last_seen_at) === today) return false
  const d = new Date(`${toPrepDateStr(q.last_rated_at)}T00:00:00Z`)
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
// the streak carries over, no midway nudge, a short rest-day coach message.
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const isRestDay = (date: string, restDay: number) => new Date(`${date}T00:00:00Z`).getUTCDay() === restDay

// The level for a stored hours value (nearest; older rows may hold any 1–14,
// so a 12 from the removed Max level reads as Intense). Unset = Steady.
export const DEFAULT_HOURS = 6
export const levelOf = (hours: number): Level =>
  LEVELS.reduce((best, l) => Math.abs(l.hours - hours) < Math.abs(best.hours - hours) ? l : best, LEVELS[1] as Level)

// The day's split (everything except the interview-redo block and the
// behavioral mock): 60% frontend, 40% backend + AI — of which 70% AI
// (Learn, Build, the week's themed drill, the AI system design mock) and
// 30% backend. Senior frontend first; AI product engineering as the edge.
export const DAY_SPLIT = { frontend: 0.6, ai: 0.4 * 0.7, backend: 0.4 * 0.3 } as const

// Frontend gets three blocks a day — what senior frontend loops test:
// coding 40%, system design / architecture 30%, theory quick-fire 30%. Each
// picks the weakest category of its group not planned in the last days
// (group size − 1 days, so the group rotates).
export const FRONTEND_SLOTS: { key: 'coding' | 'design' | 'theory'; label: string; share: number; categories: BankCategory[] }[] = [
  { key: 'coding', label: 'Frontend coding', share: 0.4, categories: ['ui-coding', 'javascript-functions', 'algorithm'] },
  { key: 'design', label: 'Frontend design', share: 0.3, categories: ['system-design', 'architecture'] },
  { key: 'theory', label: 'Frontend theory', share: 0.3, categories: ['quiz', 'code-review', 'ai-native'] },
]
// A frontend mock that day stands in for its slot.
const MOCK_SLOT: Record<string, 'coding' | 'design'> = { 'machine-coding': 'coding', 'system-design': 'design' }
export function pickFrom(categories: BankCategory[], gaps: Record<string, number>, recentByDay: string[][]): BankCategory {
  const recent = recentByDay.slice(0, categories.length - 1).flat()
  const fresh = categories.filter(c => !recent.includes(c))
  // Stable sort keeps list order on ties.
  return [...(fresh.length ? fresh : categories)].sort((a, b) => (gaps[b] ?? 0) - (gaps[a] ?? 0))[0]
}

function bankDetail(key: BankCategory, quota: number, focusTopic: string | null | undefined): string {
  const cat = BANK_CATEGORIES.find(c => c.key === key)!
  const s = quota === 1 ? '' : 's'
  // A guide, not a target: the block is a time box.
  const n = quota > 1 ? `about ${quota}` : `${quota}`
  switch (key) {
    case 'quiz': return `Answer ${n} theory questions out loud, type the gist, get the AI rating${focusTopic ? ` — focus: ${focusTopic}` : ''}`
    case 'ai-native': return `Answer ${n} AI-native question${s} from real experience, get the AI rating, tighten the answer`
    case 'ui-coding': return `Machine coding: build ${n} component${s} from scratch in your editor, timed — working, keyboard + ARIA, then summarize the trade-offs`
    case 'system-design': return `Design ${n} frontend system${s} end to end (Requirements → Architecture → Data → Interface → Optimizations), out loud, then get the AI rating`
    case 'backend': return `Answer ${n} backend & API question${s} out loud, get the AI rating`
    case 'resume': return `Answer ${n} resume deep-dive question${s} out loud from your real work — the decision, the trade-off, the number`
    case 'architecture': return `Answer ${n} architecture & lead question${s} out loud (rendering strategy, bundling, monorepo, micro-frontends, platform, leading teams) — the options, the trade-off, your call`
    case 'ai-engineering': return `Answer ${n} AI-engineering question${s} out loud — the pipeline, the trade-off, how you'd evaluate it`
    case 'code-review': return `Review ${n} AI-generated PR${s}: find the planted issues, rank them by severity, give the fix`
    case 'javascript-functions': return `Implement ${n} JS function${s} without looking anything up (polyfills, debounce, promise utilities), handle edge cases`
    default: return `Solve ${n} ${cat.label.toLowerCase()} problem${s} (medium, pattern-first), talking through complexity`
  }
}

// A question block is a time box (war.ts blockProgress): its minutes are
// the target, rounded to 5 and at least one question's worth. The question
// count is only a guide (and sizes the redo slots).
function bankBlock(c: CategoryCoverage, budget: number, opts: { label?: string; prefix?: string; topic?: string; focusTopic?: string | null; gap: number }): PrepBlock {
  const cat = BANK_CATEGORIES.find(x => x.key === c.key)!
  const minutes = Math.max(cat.minutesPerQ, Math.round(budget / 5) * 5)
  const quota = Math.max(1, Math.floor(minutes / cat.minutesPerQ))
  const redo = Math.min(c.redoDue, redoSlots(quota))
  return {
    key: `bank:${c.key}`, label: opts.label ?? cat.label, minutes,
    detail: `${opts.prefix ?? ''}${bankDetail(c.key, quota, opts.focusTopic)}${redo ? ` — the first ${redo} redo your weak answers` : ''} (${Math.round((1 - opts.gap) * 100)}% of gate)`,
    href: `/prep?tab=questions&cat=${c.key}${opts.topic ? `&topic=${encodeURIComponent(opts.topic)}` : ''}`, done: c.doneToday * cat.minutesPerQ >= minutes,
  }
}

export function buildHuntPlan(ctx: {
  hoursPerDay: number
  date: string
  coverage: CategoryCoverage[]
  // 0–1 readiness gap per category (war.ts) — picks each frontend slot's category.
  gaps?: Record<string, number>
  // Weakest theory topic, named in the Theory block.
  focusTopic?: string | null
  mockDoneToday?: boolean
  // Bank categories planned in each of the last days' sessions, newest
  // first (frontend slot rotation).
  recentByDay?: string[][]
  // prep_settings.rest_day: that weekday's plan is empty.
  restDay: number
}): { focus: string; blocks: PrepBlock[] } {
  if (isRestDay(ctx.date, ctx.restDay)) return { focus: 'Rest day', blocks: [] }
  const dayMinutes = ctx.hoursPerDay * 60
  const format = mockFormatForDay(ctx.date)
  const gap = (key: string) => ctx.gaps?.[key] ?? 0
  const cov = (key: BankCategory) => ctx.coverage.find(c => c.key === key)!
  const learn = learnBlock(ctx.date, ctx.hoursPerDay)
  const build = buildBlock(ctx.date, ctx.hoursPerDay)
  const mock: PrepBlock | null = format ? {
    key: 'mock', label: `Mock round · ${formatOf(format).label}`, minutes: formatMinutes(format),
    detail: 'Timed, no notes. Run the one-click AI review after.',
    href: `/prep?tab=mock&format=${format}`, done: !!ctx.mockDoneToday,
  } : null
  // The split covers the day minus a behavioral mock.
  const neutral = format === 'behavioral' ? mock!.minutes : 0
  const day = Math.max(120, dayMinutes - neutral)
  const feMinutes = Math.round(day * DAY_SPLIT.frontend)
  const aiMinutes = Math.round(day * DAY_SPLIT.ai)
  const backendMinutes = day - feMinutes - aiMinutes
  const recent = ctx.recentByDay ?? []

  // AI: Learn + Build + the week's themed drill (an AI system design mock
  // takes the drill's place).
  const theme = themeFor(ctx.date)
  const aiMock = format === 'ai-system-design' ? mock!.minutes : 0
  const drillMinutes = aiMinutes - (learn?.minutes ?? 0) - (build?.minutes ?? 0) - aiMock
  // Backend: its own block; a backend-themed week folds the drill into it.
  const backendBudget = backendMinutes + (theme.category === 'backend' ? Math.max(0, drillMinutes) : 0)
  const drill = theme.category !== 'backend' && drillMinutes >= 15 ? bankBlock(cov(theme.category), drillMinutes, {
    label: theme.topics.length ? `Theme: ${theme.topics.join(' + ')}` : undefined,
    prefix: theme.topics.length ? `This week's theme (${theme.topics.join(', ')}) — ` : "This week's theme — ",
    topic: theme.topics[0], gap: gap(theme.category),
  }) : null
  const backend = bankBlock(cov('backend'), backendBudget, {
    label: theme.category === 'backend' && theme.topics.length ? `Backend: ${theme.topics.join(' + ')}` : 'Backend & APIs',
    prefix: theme.category === 'backend' && theme.topics.length ? `This week's theme (${theme.topics.join(', ')}) — ` : 'Backend — ',
    topic: theme.category === 'backend' ? theme.topics[0] : undefined, gap: gap('backend'),
  })

  // Frontend: coding, design and theory, weakest first; a frontend mock
  // stands in for its slot.
  const mockSlot = format ? MOCK_SLOT[format] : undefined
  const slots = FRONTEND_SLOTS.filter(slot => slot.key !== mockSlot)
  // A mock shorter than the slot it replaces hands the rest to the others.
  const replaced = FRONTEND_SLOTS.find(slot => slot.key === mockSlot)
  const leftover = replaced ? Math.max(0, Math.round(feMinutes * replaced.share) - mock!.minutes) : 0
  const slotShare = slots.reduce((sum, slot) => sum + slot.share, 0)
  const frontend = slots.map(slot => {
    const key = pickFrom(slot.categories, ctx.gaps ?? {}, recent)
    return bankBlock(cov(key), Math.round(feMinutes * slot.share + leftover * (slot.share / slotShare)), {
      label: `${slot.label}: ${BANK_CATEGORIES.find(c => c.key === key)!.label}`,
      prefix: '', focusTopic: key === 'quiz' ? ctx.focusTopic : null, gap: gap(key),
    })
  })
  // Frontend (coding, design, theory) → mock → Learn → Build → themed
  // drill → backend.
  const blocks = [...frontend, mock, learn, build, drill, backend].filter((b): b is PrepBlock => !!b)
  return { focus: `Interview War Mode · ${levelOf(ctx.hoursPerDay).label}`, blocks }
}

// Interview War Mode is always on (there is no target date to switch it off
// since v4.0.8). Kept as the one shared check for everything that pauses or
// changes while hunting, so turning it back into a setting is one place.
export async function isHuntMode(): Promise<boolean> {
  return true
}
