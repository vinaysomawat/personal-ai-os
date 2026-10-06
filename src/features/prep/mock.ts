import { toISTDateStr } from '@/lib/date'
import { COMPETENCIES, REHEARSAL_PROMPTS, type BankQuestion, type CompetencyKey } from './types'

// Mock Round (Prep tab) — a timed interview simulation over the Question
// Bank. Deterministic: unseen questions first, then the ones you practiced
// longest ago. Nothing already practiced today is picked, so a round never
// repeats today's work.

export type MockFormat = 'screen' | 'behavioral' | 'system-design'

interface Slot {
  // A Question Bank category, or 'star' for a "Tell me about a time…" prompt.
  category: string
  // Topic filter for theory slots; 'weak' = topics of the weakest readiness areas.
  topics?: readonly string[] | 'weak'
  minutes: number
}

export const MOCK_FORMATS: { key: MockFormat; label: string; detail: string; slots: Slot[] }[] = [
  {
    key: 'screen', label: 'Frontend screen', detail: 'JS · React · TypeScript · weakest area · AI-native · behavioral',
    slots: [
      { category: 'quiz', topics: ['JavaScript Fundamentals', 'Async & Promises', 'Array & Object Methods'], minutes: 6 },
      { category: 'quiz', topics: ['React & State Management', 'Next.js'], minutes: 6 },
      { category: 'quiz', topics: ['TypeScript'], minutes: 6 },
      { category: 'quiz', topics: 'weak', minutes: 6 },
      { category: 'ai-native', minutes: 8 },
      { category: 'behavioral', minutes: 6 },
    ],
  },
  {
    key: 'behavioral', label: 'Behavioral round', detail: '5 fit questions + 2 STAR stories',
    slots: [
      ...Array.from({ length: 5 }, () => ({ category: 'behavioral', minutes: 4 })),
      { category: 'star', minutes: 5 },
      { category: 'star', minutes: 5 },
    ],
  },
  {
    key: 'system-design', label: 'System design', detail: '1 frontend design, requirements → optimizations',
    slots: [{ category: 'system-design', minutes: 45 }],
  },
]

export const formatOf = (key: string) => MOCK_FORMATS.find(f => f.key === key) ?? MOCK_FORMATS[0]
export const formatMinutes = (key: string) => formatOf(key).slots.reduce((s, x) => s + x.minutes, 0)

// Job Hunt Mode's daily mock: screens most days, behavioral twice a week,
// system design on Saturday.
export function mockFormatForDay(date: string): MockFormat {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  return weekday === 6 ? 'system-design' : weekday === 2 || weekday === 4 ? 'behavioral' : 'screen'
}

export interface MockItem {
  question_id: string | null
  category: string
  competency: string | null
  prompt: string
  url: string | null
  hints: string | null
  budget_seconds: number
  seconds: number
  answer: string
  skipped: boolean
}

export interface MockRound {
  id: string
  format: MockFormat
  items: MockItem[]
  duration_seconds: number
  created_at: string
}

const DIFFICULTY_ORDER: Record<string, number> = { medium: 0, easy: 1, hard: 2 }

function rank(a: BankQuestion, b: BankQuestion): number {
  if (!a.last_seen_at !== !b.last_seen_at) return a.last_seen_at ? 1 : -1
  if (!a.last_seen_at) {
    return (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
      (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1) || a.title.localeCompare(b.title)
  }
  return (a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? '')
}

export function buildMockRound(format: MockFormat, bank: BankQuestion[], ctx: {
  today: string
  weakTopics: string[]
  // Competencies without a solid story first — STAR slots draw from these.
  competencyOrder: CompetencyKey[]
  roundsSoFar: number
}): MockItem[] {
  const picked = new Set<string>()
  const seenToday = (q: BankQuestion) => !!q.last_seen_at && toISTDateStr(q.last_seen_at) === ctx.today
  const items: MockItem[] = []
  let starIdx = 0
  for (const slot of formatOf(format).slots) {
    if (slot.category === 'star') {
      const key = ctx.competencyOrder[starIdx % ctx.competencyOrder.length]
      const prompts = REHEARSAL_PROMPTS[key]
      items.push({
        question_id: null, category: 'star', competency: key,
        prompt: prompts[(ctx.roundsSoFar + starIdx) % prompts.length], url: null,
        hints: `STAR for ${COMPETENCIES.find(c => c.key === key)?.label}: situation, the task, what YOU did (I, not we), a measurable result — about 2 minutes`,
        budget_seconds: slot.minutes * 60, seconds: 0, answer: '', skipped: false,
      })
      starIdx++
      continue
    }
    const topics = slot.topics === 'weak' ? ctx.weakTopics : slot.topics
    const pool = bank.filter(q => q.category === slot.category && !picked.has(q.id) && !seenToday(q))
    const matching = topics?.length ? pool.filter(q => q.topics.some(t => topics.includes(t))) : pool
    // System design: prefer questions with requirements to check against.
    const candidates = (matching.length ? matching : pool).sort((a, b) =>
      slot.category === 'system-design' ? (a.answer_hints ? 0 : 1) - (b.answer_hints ? 0 : 1) || rank(a, b) : rank(a, b))
    const q = candidates[0]
    if (!q) continue
    picked.add(q.id)
    items.push({
      question_id: q.id, category: q.category, competency: null, prompt: q.title, url: q.url, hints: q.answer_hints,
      budget_seconds: slot.minutes * 60, seconds: 0, answer: '', skipped: false,
    })
  }
  return items
}
