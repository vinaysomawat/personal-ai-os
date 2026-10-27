import { PREP_DAY_ROLLOVER_HOUR, toPrepDateStr } from '@/lib/date'
import type { BankQuestion, PrepBlock, ReadinessAreaKey, ReadinessCell } from './types'
import type { MockRound } from './mock'
import { BANK_CATEGORIES, redoInterval } from './hunt'

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
  react: { gate: 80, weight: 12 },
  css: { gate: 70, weight: 3 },
  a11y: { gate: 70, weight: 3 },
  perf: { gate: 75, weight: 5 },
  testing: { gate: 70, weight: 3 },
  browser: { gate: 75, weight: 5 },
  sysdesign: { gate: 80, weight: 15 },
  ainative: { gate: 75, weight: 10 },
  uicoding: { gate: 80, weight: 12 },
  dsa: { gate: 70, weight: 5 },
  // Backend and AI follow the day's split (60% frontend · 28% AI · 12%
  // backend): real gates, but frontend areas weigh most.
  backend: { gate: 60, weight: 5 },
  aiassisted: { gate: 75, weight: 8 },
  aieng: { gate: 70, weight: 10 },
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
  // v4.0 §4.7: the tier below TOP 1% that means "go take real interviews" —
  // overall ≥60, no blind spot, mock average ≥7.
  interviewReady: boolean
}
export const INTERVIEW_READY = { overall: 60, mockAvg: 7 }

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
  const blindSpot = cells.some(c => GATES[c.key] && c.score === null)
  const interviewReady = overall >= INTERVIEW_READY.overall && !blindSpot && (mockAvg ?? 0) >= INTERVIEW_READY.mockAvg
  return { overall, weightedAvg, lowest, blockers, mockAvg, ready: blockers.length === 0, interviewReady }
}

export function readinessTier(w: WarReadiness): { label: string; tone: 'good' | 'warn' | 'risk' } {
  if (w.ready) return { label: '🔥 TOP 1% READY', tone: 'good' }
  const n = w.blockers.length
  if (w.interviewReady) return { label: `✅ INTERVIEW-READY · ${n} blocker${n === 1 ? '' : 's'} to close`, tone: 'good' }
  return { label: `❌ NOT READY · ${n} blocker${n === 1 ? '' : 's'}`, tone: 'risk' }
}

// ---------------- Topic weakness ----------------

// How much a topic matters in a Senior Frontend / AI Product Engineer loop (1 = core).
const IMPORTANCE: Record<string, number> = {
  'JavaScript Fundamentals': 1, 'Async & Promises': 1, 'React & State Management': 1, 'System Design': 1,
  'TypeScript': 0.9, 'Performance': 0.9, 'DOM & Browser APIs': 0.8, 'UI Components': 0.9, 'Networking & APIs': 0.7,
  'Accessibility': 0.7, 'CSS & Layout': 0.6, 'Testing': 0.6, 'Array & Object Methods': 0.6, 'Next.js': 0.7,
  'Algorithms': 0.5, 'Data Structures': 0.5,
  'API design': 0.8, 'Auth & security': 0.8, 'Data': 0.7, 'Node / Next.js server': 0.7, 'Caching & performance': 0.7, 'AI backend': 0.7,
  'RAG & retrieval': 0.9, 'Agents & workflows': 0.8, 'Evals & production': 0.8, 'Vector databases': 0.7, 'Embeddings & chunking': 0.7,
  'LLM fundamentals': 0.7, 'Agentic RAG': 0.7, 'Human-in-the-loop': 0.7, 'Frameworks': 0.6,
  'MCP & A2A': 0.9, 'AI product UX': 0.8,
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
  Math.max(0, Math.round((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${toPrepDateStr(from)}T00:00:00Z`).getTime()) / 86400000))

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
    const interval = redoInterval(avg)
    const d = new Date(`${toPrepDateStr(last)}T00:00:00Z`)
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

// Pace: share of today's plan done vs share of your day window gone.
// Question blocks earn partial credit by time (blockProgress), so it moves as
// you work; other blocks count when done. Ahead/behind is that gap in window
// time.
//
// The day window (prep_settings.day_start_min / day_end_min, minutes after
// IST midnight; an end before the start runs past midnight, default 12:00 →
// 01:00) is read in "prep hours": after midnight they keep counting past 24
// (1am = 25) until the 4am rollover, when the Prep day changes.
export interface DayWindow { start: number; end: number; label: string }
export const DEFAULT_DAY_WINDOW = { day_start_min: 720, day_end_min: 60 }
export function clock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`
}
export function dayWindow(s: { day_start_min: number; day_end_min: number } = DEFAULT_DAY_WINDOW): DayWindow {
  const start = s.day_start_min / 60
  const end = (s.day_end_min <= s.day_start_min ? s.day_end_min + 1440 : s.day_end_min) / 60
  return { start, end, label: `${clock(s.day_start_min)}–${clock(s.day_end_min)}` }
}
const ON_PACE_MINUTES = 10

export interface DayPace {
  plannedMinutes: number
  doneMinutes: number
  donePct: number
  dayPct: number
  // + ahead, − behind (window minutes); within ±10 counts as on pace.
  deltaMinutes: number
  blocksDone: number
  blocksTotal: number
}

// Questions practiced today per category (feeds partial block credit).
export function practicedToday(bank: Pick<BankQuestion, 'category' | 'last_seen_at'>[], today: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const q of bank) if (q.last_seen_at && toPrepDateStr(q.last_seen_at) === today) out[q.category] = (out[q.category] ?? 0) + 1
  return out
}

// ---------------- Time-boxed question blocks ----------------

// A question block (bank:<category>) is a time box. Its progress in minutes
// is the larger of the time focused on it today and today's answers in its
// category × that category's minutes per question (so Telegram drills and
// mock answers count without the timer). It ticks itself at its planned
// minutes; FocusBar Finish is allowed from FINISH_SHARE of them.
export const FINISH_SHARE = 0.8
export interface ProgressCtx {
  // Questions answered today per category (practicedToday).
  answered: Record<string, number>
  // Focused minutes today per block key (focusedMinutes).
  focused: Record<string, number>
}
const NO_PROGRESS: ProgressCtx = { answered: {}, focused: {} }

export const minutesPerQuestion = (category: string) => BANK_CATEGORIES.find(c => c.key === category)?.minutesPerQ ?? 10

// Minutes focused per block key on `date`, the active session counted live.
export function focusedMinutes(sessions: FocusSession[], date: string, nowMs = Date.now()): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of sessions) if (f.date === date) out[f.block_key] = (out[f.block_key] ?? 0) + focusSeconds(f, nowMs) / 60
  return out
}

// Minutes of progress on a block, capped at its planned minutes. Non-question
// blocks have none until done.
export function blockProgress(b: Pick<PrepBlock, 'key' | 'minutes' | 'done'>, ctx: ProgressCtx): number {
  if (b.done) return b.minutes
  if (!b.key.startsWith('bank:')) return 0
  const cat = b.key.slice(5)
  return Math.min(b.minutes, Math.max(ctx.focused[b.key] ?? 0, (ctx.answered[cat] ?? 0) * minutesPerQuestion(cat)))
}
export const blockReached = (b: Pick<PrepBlock, 'key' | 'minutes' | 'done'>, ctx: ProgressCtx) => b.minutes > 0 && blockProgress(b, ctx) >= b.minutes
export const canFinishBlock = (b: Pick<PrepBlock, 'key' | 'minutes' | 'done'>, ctx: ProgressCtx) =>
  !b.key.startsWith('bank:') || blockProgress(b, ctx) >= b.minutes * FINISH_SHARE

export function dayPace(blocks: PrepBlock[], prepHour: number, ctx: ProgressCtx = NO_PROGRESS, window: DayWindow = dayWindow()): DayPace {
  const progress = (b: PrepBlock) => b.minutes ? blockProgress(b, ctx) / b.minutes : (b.done ? 1 : 0)
  const plannedMinutes = blocks.reduce((s, b) => s + b.minutes, 0)
  const doneMinutes = Math.round(blocks.reduce((s, b) => s + b.minutes * progress(b), 0))
  const done = plannedMinutes ? doneMinutes / plannedMinutes : 0
  const day = Math.min(1, Math.max(0, (prepHour - window.start) / (window.end - window.start)))
  return {
    plannedMinutes, doneMinutes,
    donePct: Math.round(done * 100), dayPct: Math.round(day * 100),
    deltaMinutes: Math.round((done - day) * (window.end - window.start) * 60),
    blocksDone: blocks.filter(b => b.done).length, blocksTotal: blocks.length,
  }
}

export type PaceStatus = 'ahead' | 'on' | 'behind'
export const paceStatus = (p: Pick<DayPace, 'deltaMinutes'>): PaceStatus =>
  p.deltaMinutes > ON_PACE_MINUTES ? 'ahead' : p.deltaMinutes < -ON_PACE_MINUTES ? 'behind' : 'on'
export const paceLabel = (p: Pick<DayPace, 'deltaMinutes'>) => {
  const s = paceStatus(p)
  return s === 'on' ? 'On pace' : `${s === 'ahead' ? 'Ahead' : 'Behind'} ${hm(Math.abs(p.deltaMinutes))}`
}

// The current IST hour as a float in prep hours: before the 4am rollover it
// still belongs to the previous Prep day, so 12:30am reads 24.5.
export const prepHourNow = () => {
  const d = new Date(Date.now() + 5.5 * 3600_000)
  const h = d.getUTCHours() + d.getUTCMinutes() / 60
  return h < PREP_DAY_ROLLOVER_HOUR ? h + 24 : h
}

export const hm = (min: number) => min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}` : `${min}m`

// A good day = 3 blocks done (whatever the %).
export const GOOD_DAY_BLOCKS = 3
export function isGoodDay(blocks: Pick<PrepBlock, 'done'>[]): boolean {
  return blocks.filter(b => b.done).length >= GOOD_DAY_BLOCKS
}

// Coach copy: what got done first, then the single next step. Factual and
// short, no guilt wording.
export function coachLine(p: DayPace, next: Pick<PrepBlock, 'label'> | null, good: boolean): string {
  const done = `${p.blocksDone}/${p.blocksTotal} blocks done${good ? ' — a good day ✓' : ''}`
  if (p.blocksTotal > 0 && p.blocksDone === p.blocksTotal) return `All ${p.blocksTotal} blocks done — a good day ✓`
  if (p.dayPct >= 100) return `${done}.`
  if (!next) return `${done}.`
  if (p.blocksDone === 0) return `Start with ${next.label}.`
  return `${done}. Next: ${next.label}.`
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
  backend: ['backend'],
  'code-review': ['aiassisted', 'testing'],
  resume: ['behavioral', 'leadership'],
  architecture: ['sysdesign', 'leadership'],
  'ai-engineering': ['aieng'],
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
