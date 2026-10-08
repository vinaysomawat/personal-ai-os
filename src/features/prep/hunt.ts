import type { PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay } from './mock'

// Job Hunt Mode (ROADMAP-v2 §9) — deterministic full-day plan sized to the
// user's daily hours and days left before the target date. Each question
// category gets a share of the day and a per-question time cost; the daily
// quota is the smaller of "what fits in that time" and "what's needed to
// cover the remaining questions by the target date".

export type BankCategory = 'quiz' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm'

export const BANK_CATEGORIES: { key: BankCategory; label: string; share: number; minutesPerQ: number }[] = [
  { key: 'quiz', label: 'Theory', share: 0.17, minutesPerQ: 4 },
  // Answer from real experience + AI interviewer feedback (Apollo JD bar).
  { key: 'ai-native', label: 'AI-native', share: 0.15, minutesPerQ: 10 },
  // General/fit questions (tell me about yourself, the layoff, salary…).
  { key: 'behavioral', label: 'Behavioral Q&A', share: 0.04, minutesPerQ: 10 },
  { key: 'javascript-functions', label: 'JS functions', share: 0.15, minutesPerQ: 25 },
  { key: 'ui-coding', label: 'UI coding', share: 0.15, minutesPerQ: 45 },
  { key: 'system-design', label: 'System design', share: 0.10, minutesPerQ: 60 },
  // Lowest-signal pool for a senior FE loop — gave half its time to AI-native.
  { key: 'algorithm', label: 'Algorithms', share: 0.03, minutesPerQ: 30 },
]
// Rest of the day: a daily Mock Round (~5%, fixed by its format) and STAR
// stories 6%. The Applications block (10%) was removed 2026-10-08 —
// applying happens outside the app — and its time went to the bank.
const BEHAVIORAL_SHARE = 0.06
// Share of the day for Question Bank blocks (base shares sum to 0.79 and
// are scaled up to this).
const BANK_SHARE = 0.89

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
export function computeQuotas(coverage: CategoryCoverage[], hoursPerDay: number, days: number, weights: Record<string, number> = {}): CategoryQuota[] {
  const dayMinutes = hoursPerDay * 60
  const weightedTotal = BANK_CATEGORIES.reduce((s, c) => s + c.share * (weights[c.key] ?? 1), 0)
  return BANK_CATEGORIES.map(cat => {
    const c = coverage.find(x => x.key === cat.key)!
    const share = (cat.share * (weights[cat.key] ?? 1) * BANK_SHARE) / weightedTotal
    const quota = Math.max(1, Math.floor((dayMinutes * share) / cat.minutesPerQ))
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
        : `Solve ${q.quota} ${cat.label} question${q.quota === 1 ? '' : 's'}, then hit Next`
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
  // Weakest two areas first, then the mock round, then the rest.
  const blocks: PrepBlock[] = [...bankBlocks.slice(0, 2), mock, ...bankBlocks.slice(2)]
  blocks.push({
    key: 'lead', label: 'STAR stories', minutes: Math.round(dayMinutes * BEHAVIORAL_SHARE),
    detail: ctx.uncoveredCompetency ? `Write a STAR story for "${ctx.uncoveredCompetency}", then rehearse one out loud` : 'Rehearse 2 stories out loud and get feedback on one',
    href: '/prep?tab=stories', done: false,
  })
  return { focus: `Job hunt · D-${ctx.days}`, blocks }
}
