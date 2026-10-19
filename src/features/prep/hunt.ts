import { toISTDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock } from './types'
import { formatMinutes, formatOf, mockFormatForDay, type MockFormat } from './mock'

// Interview War Mode — the daily load level, the mock block, Company Prep
// Mode and the Question Bank categories. The day itself is the Boss Ladder
// (boss.ts).

export type BankCategory = 'interview' | 'quiz' | 'angular' | 'ai-native' | 'behavioral' | 'javascript-functions' | 'ui-coding' | 'system-design' | 'algorithm' | 'backend' | 'code-review' | 'resume' | 'architecture'

// minutesPerQ = a question's planned time (the Questions tab's "≈ Xh to
// complete").
export const BANK_CATEGORIES: { key: BankCategory; label: string; minutesPerQ: number }[] = [
  // Questions real interviewers asked (v4.0 §4.1).
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

// Redo weak answers: a question whose latest rating is under 7 comes back
// 1 day (<5), 2 days (<6) or 4 days (<7) after that rating — the same gaps
// as the topic revision queue. Due redos lead the Questions tab list and
// fights. One answered today isn't due again today.
export const redoInterval = (rating: number) => rating < 5 ? 1 : rating < 6 ? 2 : 4
export function isRedoDue(q: Pick<BankQuestion, 'last_rating' | 'last_rated_at' | 'last_seen_at'>, today: string): boolean {
  if (q.last_rating === null || q.last_rating >= 7 || !q.last_rated_at) return false
  if (q.last_seen_at && toISTDateStr(q.last_seen_at) === today) return false
  const d = new Date(`${toISTDateStr(q.last_rated_at)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + redoInterval(q.last_rating))
  return d.toISOString().slice(0, 10) <= today
}

// Daily load level (stored as prep_settings.hours_per_day): the number of
// fights in the day's plan, the mock included. Pace is judged against it.
export const LEVELS = [
  { key: 'light', label: 'Light', hours: 4, fights: 2 },
  { key: 'steady', label: 'Steady', hours: 6, fights: 3 },
  { key: 'intense', label: 'Intense', hours: 8, fights: 4 },
  { key: 'max', label: 'Max', hours: 12, fights: 5 },
] as const
export type Level = typeof LEVELS[number]
// The level for a stored hours value (nearest; older rows may hold any 1–14).
export const levelOf = (hours: number): Level =>
  LEVELS.reduce((best, l) => Math.abs(l.hours - hours) < Math.abs(best.hours - hours) ? l : best, LEVELS[2] as Level)

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
const MOCK_FOR_KIND: Record<string, MockFormat> = {
  system_design: 'system-design', coding: 'machine-coding', behavioral: 'behavioral', hiring_manager: 'behavioral',
}
// What each company segment's loops lean on (v4.1): the suggested mock and
// the Question Bank areas to drill. A round kind that names its own format
// (system design, coding, behavioral) still picks the mock.
const SEGMENT_PREP: Record<string, { mock: MockFormat; why: string; links: { label: string; href: string }[] }> = {
  big_tech: { mock: 'code-review', why: 'big tech: reviewing AI-generated code, algorithms, system design', links: [
    { label: 'Algorithms', href: '/prep?tab=questions&cat=algorithm' }, { label: 'System design', href: '/prep?tab=questions&cat=system-design' } ] },
  product_india: { mock: 'machine-coding', why: 'Indian product company: machine coding, web fundamentals, algorithms', links: [
    { label: 'Web fundamentals', href: '/prep?tab=questions&cat=quiz&topic=DOM%20%26%20Browser%20APIs' }, { label: 'Algorithms', href: '/prep?tab=questions&cat=algorithm' } ] },
  startup: { mock: 'system-design', why: 'startup: backend, full-stack system design, a project deep-dive story', links: [
    { label: 'Backend & APIs', href: '/prep?tab=questions&cat=backend' }, { label: 'Full-stack design', href: '/prep?tab=questions&cat=system-design&topic=Full-stack' }, { label: 'Deep-dive story', href: '/prep?tab=stories' } ] },
  ai_company: { mock: 'code-review', why: 'AI company: AI-native, streaming UI, AI backend', links: [
    { label: 'AI-native', href: '/prep?tab=questions&cat=ai-native' }, { label: 'Streaming UI', href: '/prep?tab=questions&cat=system-design&topic=AI' }, { label: 'AI backend', href: '/prep?tab=questions&cat=backend&topic=AI%20backend' } ] },
}
const DEFAULT_PREP: { mock: MockFormat; why: string; links: { label: string; href: string }[] } = { mock: 'machine-coding', why: 'theory, machine coding, behavioral', links: [
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

// Interview War Mode is always on (there is no target date to switch it off
// since v4.0.8). Kept as the one shared check for everything that pauses or
// changes while hunting, so turning it back into a setting is one place.
export async function isHuntMode(): Promise<boolean> {
  return true
}

// The day's mock: the format the next booked round tests (its kind, else
// its company's segment), otherwise the weekday rotation.
export function mockFormatFor(next: Pick<UpcomingRound, 'kind' | 'segment'> | null, date: string): MockFormat {
  if (!next) return mockFormatForDay(date)
  return MOCK_FOR_KIND[next.kind] ?? (SEGMENT_PREP[next.segment ?? 'other'] ?? DEFAULT_PREP).mock
}

export function mockBlock(format: MockFormat, done: boolean, label = `Mock round · ${formatOf(format).label}`): PrepBlock {
  return {
    key: `mock:${format}`, label, minutes: formatMinutes(format),
    detail: 'Timed, no notes. Run the one-click AI review after.',
    href: `/prep?tab=mock&format=${format}`, done,
  }
}

// Every boss beaten: a full loop back to back.
export const FINAL_BOSS: MockFormat[] = ['screen', 'system-design', 'behavioral']
