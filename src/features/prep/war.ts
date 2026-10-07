import { toISTDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock, ReadinessAreaKey, ReadinessCell } from './types'
import type { MockRound } from './mock'

// Interview War Mode (ROADMAP-v2 §10) — every number here is deterministic.
// AI only writes answer reviews and the weekly forecast; it never scores,
// allocates time or decides what's next.

export interface FocusSession {
  id: string
  date: string
  block_key: string
  label: string
  planned_minutes: number
  started_at: string
  paused_at: string | null
  paused_seconds: number
  interruptions: number
  ended_at: string | null
  actual_seconds: number | null
  status: 'active' | 'completed' | 'abandoned'
}

// Seconds of real focus: wall clock minus pauses (live for an active one).
export function focusSeconds(f: FocusSession, nowMs = Date.now()): number {
  if (f.actual_seconds !== null && f.status !== 'active') return f.actual_seconds
  const end = f.paused_at ? new Date(f.paused_at).getTime() : nowMs
  return Math.max(0, Math.round((end - new Date(f.started_at).getTime()) / 1000) - f.paused_seconds)
}

// Weekly AI forecast (prep_forecasts.forecast). Confidence is not the AI's —
// it's War readiness at the time.
export interface Forecast {
  strengths: string[]
  failures: { area: string; why: string }[]
  riskQuestion: string
  fixFirst: string[]
  confidence: number
}

// ---------------- Readiness gates ----------------

// "Top 1% ready" bar per area. Weight = share of the overall score.
export const GATES: Record<ReadinessAreaKey, { gate: number; weight: number }> = {
  js: { gate: 80, weight: 10 },
  ts: { gate: 75, weight: 5 },
  react: { gate: 80, weight: 10 },
  css: { gate: 70, weight: 3 },
  a11y: { gate: 70, weight: 3 },
  perf: { gate: 75, weight: 5 },
  testing: { gate: 70, weight: 3 },
  browser: { gate: 75, weight: 5 },
  sysdesign: { gate: 80, weight: 15 },
  ainative: { gate: 75, weight: 10 },
  uicoding: { gate: 80, weight: 10 },
  dsa: { gate: 70, weight: 5 },
  behavioral: { gate: 80, weight: 5 },
  leadership: { gate: 75, weight: 3 },
}
export const MOCK_GATE = 8 // average of the last 5 reviewed rounds, /10
const MOCK_WEIGHT = 10

export interface WarReadiness {
  // Weighted average × bottleneck penalty, 0–100.
  overall: number
  weightedAvg: number
  lowest: { label: string; score: number } | null
  // Areas (and the mock average) under their gate, biggest gap first.
  blockers: { key: string; label: string; score: number | null; gate: number }[]
  mockAvg: number | null
  ready: boolean
}

// Overall = weighted average × (0.5 + 0.5 × lowest/100): one weak area can
// at most halve the score, so strength elsewhere can't hide it. Blind spots
// (no data) count as 0 — an untested area is a risk, not a pass.
export function warReadiness(cells: ReadinessCell[], rounds: MockRound[]): WarReadiness {
  const reviewed = rounds.filter(r => r.review?.score != null).slice(0, 5)
  const mockAvg = reviewed.length ? Math.round((reviewed.reduce((s, r) => s + r.review!.score!, 0) / reviewed.length) * 10) / 10 : null
  let sum = 0, weights = 0
  for (const c of cells) {
    const g = GATES[c.key]
    if (!g) continue
    sum += (c.score ?? 0) * g.weight
    weights += g.weight
  }
  sum += (mockAvg ?? 0) * 10 * MOCK_WEIGHT
  weights += MOCK_WEIGHT
  const weightedAvg = Math.round(sum / weights)
  const scored = [...cells.filter(c => GATES[c.key]).map(c => ({ label: c.label, score: c.score ?? 0 })), { label: 'Mock average', score: (mockAvg ?? 0) * 10 }]
  const lowest = scored.reduce<{ label: string; score: number } | null>((m, c) => !m || c.score < m.score ? c : m, null)
  const overall = Math.round(weightedAvg * (0.5 + 0.5 * ((lowest?.score ?? 0) / 100)))
  const blockers = [
    ...cells.filter(c => GATES[c.key] && (c.score ?? 0) < GATES[c.key].gate).map(c => ({ key: c.key, label: c.label, score: c.score, gate: GATES[c.key].gate })),
    ...((mockAvg ?? 0) < MOCK_GATE ? [{ key: 'mock', label: 'Mock average', score: mockAvg === null ? null : mockAvg * 10, gate: MOCK_GATE * 10 }] : []),
  ].sort((a, b) => (b.gate - (b.score ?? 0)) - (a.gate - (a.score ?? 0)))
  return { overall, weightedAvg, lowest, blockers, mockAvg, ready: blockers.length === 0 }
}

// ---------------- Topic weakness ----------------

// How much a topic matters in a senior frontend loop (1 = core).
const IMPORTANCE: Record<string, number> = {
  'JavaScript Fundamentals': 1, 'Async & Promises': 1, 'React & State Management': 1, 'System Design': 1,
  'TypeScript': 0.9, 'Performance': 0.9, 'DOM & Browser APIs': 0.8, 'UI Components': 0.9, 'Networking & APIs': 0.7,
  'Accessibility': 0.7, 'CSS & Layout': 0.6, 'Testing': 0.6, 'Array & Object Methods': 0.6, 'Next.js': 0.7,
  'Algorithms': 0.5, 'Data Structures': 0.5,
}
const importanceOf = (topic: string) => IMPORTANCE[topic] ?? 0.5

export interface TopicWeakness {
  topic: string
  category: string
  seen: number
  rated: number
  avgRating: number | null
  struggles: number
  lastPracticed: string | null
  daysSince: number | null
  importance: number
  score: number
}

const daysBetween = (from: string, today: string) =>
  Math.max(0, Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${toISTDateStr(from)}T00:00:00Z`).getTime()) / 86400000))

// weakness = struggleRate×40 + (1 − avgRating/10)×25 + recency×15 + importance×20,
// where a struggle is a rating ≤5, recency grows to 1 over 14 days without
// practice, and unknowns (nothing rated / never practiced) count as 0.5 / 1.
// High = practice this first.
export function topicWeakness(bank: BankQuestion[], today: string): TopicWeakness[] {
  const byTopic = new Map<string, BankQuestion[]>()
  for (const q of bank) for (const t of q.topics) byTopic.set(t, [...(byTopic.get(t) ?? []), q])
  return [...byTopic.entries()].map(([topic, qs]) => {
    const seen = qs.filter(q => q.last_seen_at)
    const rated = qs.filter(q => q.last_rating !== null)
    const avgRating = rated.length ? Math.round((rated.reduce((s, q) => s + q.last_rating!, 0) / rated.length) * 10) / 10 : null
    const struggles = rated.filter(q => q.last_rating! <= 5).length
    const lastPracticed = seen.reduce<string | null>((m, q) => !m || q.last_seen_at! > m ? q.last_seen_at! : m, null)
    const daysSince = lastPracticed ? daysBetween(lastPracticed, today) : null
    const cats = new Map<string, number>()
    for (const q of (rated.length ? rated : qs)) cats.set(q.category, (cats.get(q.category) ?? 0) + 1)
    const category = [...cats.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const struggleRate = rated.length ? struggles / rated.length : 0.5
    const ratingGap = avgRating === null ? 0.5 : 1 - avgRating / 10
    const recency = daysSince === null ? 1 : Math.min(1, daysSince / 14)
    const importance = importanceOf(topic)
    const score = Math.round(struggleRate * 40 + ratingGap * 25 + recency * 15 + importance * 20)
    return { topic, category, seen: seen.length, rated: rated.length, avgRating, struggles, lastPracticed, daysSince, importance, score }
  }).sort((a, b) => b.score - a.score)
}

// ---------------- Revision queue ----------------

export interface RevisionItem {
  topic: string
  category: string
  avgRating: number
  due: string
  status: 'overdue' | 'today' | 'tomorrow' | 'later'
  daysOverdue: number
}

// Topic-level spaced repetition: a topic whose rated answers average under 7
// comes back after 1 day (<5), 2 days (<6) or 4 days (<7) from its last
// rating. Practising it again (a new rating) reschedules it.
export function revisionQueue(bank: BankQuestion[], today: string): RevisionItem[] {
  const byTopic = new Map<string, BankQuestion[]>()
  for (const q of bank) if (q.last_rating !== null && q.last_rated_at) for (const t of q.topics) byTopic.set(t, [...(byTopic.get(t) ?? []), q])
  const items: RevisionItem[] = []
  for (const [topic, qs] of byTopic) {
    const avg = qs.reduce((s, q) => s + q.last_rating!, 0) / qs.length
    if (avg >= 7) continue
    const last = qs.reduce((m, q) => q.last_rated_at! > m ? q.last_rated_at! : m, qs[0].last_rated_at!)
    const interval = avg < 5 ? 1 : avg < 6 ? 2 : 4
    const d = new Date(`${toISTDateStr(last)}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + interval)
    const due = d.toISOString().slice(0, 10)
    const diff = Math.round((new Date(`${due}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000)
    const cats = new Map<string, number>()
    for (const q of qs) cats.set(q.category, (cats.get(q.category) ?? 0) + 1)
    items.push({
      topic, category: [...cats.entries()].sort((a, b) => b[1] - a[1])[0][0],
      avgRating: Math.round(avg * 10) / 10, due,
      status: diff < 0 ? 'overdue' : diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : 'later',
      daysOverdue: Math.max(0, -diff),
    })
  }
  return items.sort((a, b) => a.due.localeCompare(b.due) || a.avgRating - b.avgRating)
}

// ---------------- Pace + tone ----------------

// The prep day runs 09:00–21:00 IST; by a given time, that share of the
// planned minutes "should" be done.
const DAY_START = 9, DAY_END = 21

export interface DayPace {
  plannedMinutes: number
  doneMinutes: number
  focusedMinutes: number
  expectedMinutes: number
  behindMinutes: number
  blocksDone: number
  blocksTotal: number
}

export function dayPace(blocks: PrepBlock[], focusedMinutes: number, istHourFloat: number): DayPace {
  const plannedMinutes = blocks.reduce((s, b) => s + b.minutes, 0)
  const doneMinutes = blocks.filter(b => b.done).reduce((s, b) => s + b.minutes, 0)
  const frac = Math.min(1, Math.max(0, (istHourFloat - DAY_START) / (DAY_END - DAY_START)))
  const expectedMinutes = Math.round(plannedMinutes * frac)
  return {
    plannedMinutes, doneMinutes, focusedMinutes, expectedMinutes,
    behindMinutes: Math.max(0, expectedMinutes - doneMinutes),
    blocksDone: blocks.filter(b => b.done).length, blocksTotal: blocks.length,
  }
}

export const hm = (min: number) => min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}` : `${min}m`

// Brutal coach copy — no praise for partial work.
export function coachLine(p: DayPace, istHourFloat: number): string {
  if (p.blocksTotal > 0 && p.blocksDone === p.blocksTotal) return 'All blocks done. It only counts if tomorrow looks the same.'
  if (p.blocksDone === 0 && istHourFloat >= 10) return `0 of ${p.blocksTotal} blocks done and ${Math.round(((istHourFloat - DAY_START) / (DAY_END - DAY_START)) * 100)}% of the day is gone. Start the next block now.`
  if (p.behindMinutes >= 30) return `${p.blocksDone}/${p.blocksTotal} blocks. You're ${hm(p.behindMinutes)} behind plan. Don't add random work — do the next block.`
  return `${p.blocksDone}/${p.blocksTotal} blocks, on pace. Readiness only moves with reps.`
}

// The one thing to do now: the first unfinished block (plan order is
// already weakest-first).
export const nowBlock = (blocks: PrepBlock[]) => blocks.find(b => !b.done) ?? null

// ---------------- Adaptive allocation ----------------

// Which readiness areas each Question Bank category trains.
const CATEGORY_AREAS: Record<string, ReadinessAreaKey[]> = {
  quiz: ['js', 'ts', 'react', 'css', 'a11y', 'perf', 'testing', 'browser'],
  'ai-native': ['ainative'],
  behavioral: ['behavioral'],
  'javascript-functions': ['js'],
  'ui-coding': ['uicoding'],
  'system-design': ['sysdesign'],
  algorithm: ['dsa'],
}

// 0 (at/over gate) … 1 (blind spot) — how far a category's areas sit below
// their gates, averaged.
export function categoryGap(category: string, cells: ReadinessCell[]): number {
  const keys = CATEGORY_AREAS[category] ?? []
  const gaps = keys.map(k => {
    const c = cells.find(x => x.key === k)
    const gate = GATES[k].gate
    return c?.score == null ? 1 : Math.max(0, (gate - c.score) / gate)
  })
  return gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0.5
}

// Time multiplier per category: 0.5 (no gap) … 1.5 (blind spot). Shares are
// renormalized by the caller so the day's total stays the same — the plan
// moves time toward the biggest interview risk instead of spreading evenly.
export function categoryWeights(cells: ReadinessCell[]): Record<string, number> {
  return Object.fromEntries(Object.keys(CATEGORY_AREAS).map(c => [c, 0.5 + categoryGap(c, cells)]))
}
