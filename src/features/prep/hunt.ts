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
// Remaining 21% of the day: a daily Mock Round (~5%, fixed by its format),
// STAR stories 6%, applications 10%.
const BEHAVIORAL_SHARE = 0.06
const APPLICATIONS_SHARE = 0.10

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

export function computeQuotas(coverage: CategoryCoverage[], hoursPerDay: number, days: number): CategoryQuota[] {
  const dayMinutes = hoursPerDay * 60
  return BANK_CATEGORIES.map(cat => {
    const c = coverage.find(x => x.key === cat.key)!
    const capacity = Math.max(1, Math.floor((dayMinutes * cat.share) / cat.minutesPerQ))
    // Unseen left at the start of today (today's practice already counted in seen).
    const remaining = Math.max(0, c.total - c.seen + c.doneToday)
    const needed = Math.ceil(remaining / days)
    const quota = Math.min(capacity, needed)
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
}): { focus: string; blocks: PrepBlock[] } {
  const dayMinutes = ctx.hoursPerDay * 60
  const format = mockFormatForDay(ctx.date)
  const blocks: PrepBlock[] = [{
    key: 'mock', label: `Mock round · ${formatOf(format).label}`, minutes: formatMinutes(format),
    detail: 'Timed, no notes — yesterday\'s misses come back first. Grade every answer after.',
    href: `/prep?tab=mock&format=${format}`, done: false,
  }]
  for (const q of ctx.quotas) {
    if (q.quota === 0) continue
    const cat = BANK_CATEGORIES.find(c => c.key === q.key)!
    blocks.push({
      key: `bank:${q.key}`, label: `${cat.label} × ${q.quota}`, minutes: q.minutes,
      detail: q.key === 'quiz'
        ? `Answer ${q.quota} theory questions out loud, then check — misses come back in mock rounds`
        : q.key === 'ai-native'
        ? `Answer ${q.quota} AI-native questions from real experience, get interviewer feedback, tighten the answer`
        : q.key === 'behavioral'
        ? `Say ${q.quota} answer${q.quota === 1 ? '' : 's'} out loud (tell me about yourself, the layoff, salary…), get feedback, tighten`
        : `Solve ${q.quota} unseen ${cat.label.toLowerCase()} question${q.quota === 1 ? '' : 's'}, then hit Next`,
      href: `/prep?tab=questions&cat=${q.key}`, done: q.doneToday >= q.quota,
    })
  }
  blocks.push({
    key: 'lead', label: 'STAR stories', minutes: Math.round(dayMinutes * BEHAVIORAL_SHARE),
    detail: ctx.uncoveredCompetency ? `Write a STAR story for "${ctx.uncoveredCompetency}", then rehearse one out loud` : 'Rehearse 2 stories out loud and get feedback on one',
    href: '/prep?tab=stories', done: false,
  })
  blocks.push({
    key: 'applications', label: 'Applications', minutes: Math.round(dayMinutes * APPLICATIONS_SHARE),
    detail: 'Send 5 tailored applications or referral asks, and follow up on anything older than 7 days',
    href: '/career', done: false,
  })
  return { focus: `Job hunt · D-${ctx.days}`, blocks }
}
