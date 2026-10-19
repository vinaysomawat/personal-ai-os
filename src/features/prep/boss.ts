import { toISTDateStr } from '@/lib/date'
import { isRedoDue } from './hunt'
import { GATES } from './war'
import type { Scorecard } from './scorecard'
import type { BankQuestion, PrepBlock, ReadinessAreaKey, ReadinessCell } from './types'

// Boss Ladder (v4.1) — deterministic, client-safe. Every readiness area with
// a gate is a boss; a fight is a short timed set of rated answers on that
// area. Win = average ≥ gate / 10 and no answer under 5. Fights run on the
// web (fight.ts) and over Telegram; the AI only grades the answers.

// One slot of a fight: questions from these categories (optionally only
// these topics), each with its time budget.
interface Slot { categories: string[]; topics?: string[]; notTopics?: string[]; count: number; seconds: number }

const TALK = ['quiz', 'architecture']
const topicFight = (topics: string[]): Slot[] => [{ categories: TALK, topics, count: 5, seconds: 300 }]

export const FIGHTS: Record<ReadinessAreaKey, Slot[]> = {
  js: topicFight(['JavaScript Fundamentals', 'Async & Promises', 'Array & Object Methods']),
  ts: topicFight(['TypeScript']),
  react: topicFight(['React & State Management', 'Next.js']),
  css: topicFight(['CSS & Layout']),
  a11y: topicFight(['Accessibility']),
  perf: topicFight(['Performance', 'Performance architecture']),
  testing: topicFight(['Testing']),
  browser: topicFight(['DOM & Browser APIs', 'Networking & APIs']),
  sysdesign: [
    { categories: ['system-design'], count: 1, seconds: 1800 },
    { categories: ['architecture'], notTopics: ['Tech lead'], count: 2, seconds: 360 },
  ],
  ainative: [{ categories: ['ai-native'], count: 5, seconds: 360 }],
  uicoding: [{ categories: ['ui-coding'], count: 1, seconds: 2700 }],
  backend: [{ categories: ['backend'], count: 5, seconds: 360 }],
  aiassisted: [{ categories: ['code-review'], count: 2, seconds: 900 }],
  dsa: [{ categories: ['algorithm'], count: 1, seconds: 1800 }],
  behavioral: [{ categories: ['behavioral', 'resume'], count: 5, seconds: 300 }],
  leadership: [{ categories: ['architecture'], topics: ['Tech lead'], count: 5, seconds: 360 }],
}
export const BOSS_AREAS = Object.keys(FIGHTS) as ReadinessAreaKey[]

// Coding bosses: one problem, solved in your editor, solution pasted back.
export const CODING_BOSSES: ReadinessAreaKey[] = ['uicoding', 'dsa']

export const fightMinutes = (area: ReadinessAreaKey) => Math.round(FIGHTS[area].reduce((s, x) => s + x.count * x.seconds, 0) / 60)
export const fightSize = (area: ReadinessAreaKey) => FIGHTS[area].reduce((s, x) => s + x.count, 0)
export const winAt = (gate: number) => gate / 10
export const MIN_ANSWER = 5

export interface FightItem {
  question_id: string
  title: string
  category: string
  hints: string | null
  body: string | null
  url: string | null
  budget_seconds: number
  answer: string
  seconds: number
  spoken: boolean
  rating: number | null
  card: Scorecard | null
}
export interface FixPoint { question: string; point: string; status: 'partial' | 'missing'; note: string }
export type FightStatus = 'active' | 'won' | 'lost' | 'abandoned'
export interface Fight {
  id: string
  date: string
  area: ReadinessAreaKey
  channel: 'web' | 'telegram'
  items: FightItem[]
  current: number
  gate: number
  status: FightStatus
  score: number | null
  fix: FixPoint[] | null
  fix_read_at: string | null
  started_at: string
  updated_at: string
  ended_at: string | null
}

const DIFFICULTY = { easy: 0, medium: 1, hard: 2 } as Record<string, number>

// Weak answers due for a redo first (lowest rating first), then unseen in
// practice order, then the one practiced longest ago. Nothing answered
// today, nothing picked twice.
export function pickFightQuestions(area: ReadinessAreaKey, bank: BankQuestion[], today: string): BankQuestion[] {
  const picked = new Set<string>()
  const out: BankQuestion[] = []
  for (const slot of FIGHTS[area]) {
    const pool = bank.filter(q => slot.categories.includes(q.category) && !picked.has(q.id)
      && !(q.last_seen_at && toISTDateStr(q.last_seen_at) === today)
      && (!slot.topics || q.topics.some(t => slot.topics!.includes(t)))
      && (!slot.notTopics || !q.topics.some(t => slot.notTopics!.includes(t))))
    const rank = (q: BankQuestion) => isRedoDue(q, today) ? 0 : q.last_seen_at ? 2 : 1
    const sorted = pool.sort((a, b) => rank(a) - rank(b)
      || (rank(a) === 0 ? (a.last_rating ?? 0) - (b.last_rating ?? 0) : 0)
      || (rank(a) === 1 ? (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) || (DIFFICULTY[a.difficulty] ?? 1) - (DIFFICULTY[b.difficulty] ?? 1) : 0)
      || (a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? ''))
    for (const q of sorted.slice(0, slot.count)) { picked.add(q.id); out.push(q) }
  }
  return out
}

export function fightItems(area: ReadinessAreaKey, bank: BankQuestion[], today: string): FightItem[] {
  const budgets = FIGHTS[area].flatMap(s => Array.from({ length: s.count }, () => ({ categories: s.categories, seconds: s.seconds })))
  return pickFightQuestions(area, bank, today).map(q => ({
    question_id: q.id, title: q.title, category: q.category, hints: q.answer_hints, body: q.body, url: q.url,
    budget_seconds: budgets.find(b => b.categories.includes(q.category))?.seconds ?? 300,
    answer: '', seconds: 0, spoken: false, rating: null, card: null,
  }))
}

// Average rating of a graded fight; an ungraded answer (skipped, budget
// fallback) counts as 0 — no rating is not a pass.
export function fightScore(items: Pick<FightItem, 'rating'>[]): number {
  if (items.length === 0) return 0
  return Math.round((items.reduce((s, i) => s + (i.rating ?? 0), 0) / items.length) * 10) / 10
}
export const fightWon = (items: Pick<FightItem, 'rating'>[], gate: number) =>
  items.length > 0 && fightScore(items) >= winAt(gate) && items.every(i => i.rating !== null && i.rating >= MIN_ANSWER)

// Fix card: every key point the scorecards marked missing or partial.
export function fixPoints(items: FightItem[]): FixPoint[] {
  return items.flatMap(i => (i.card?.points ?? []).filter(p => p.status !== 'covered')
    .map(p => ({ question: i.title, point: p.point, status: p.status as 'partial' | 'missing', note: p.note })))
}

// ---------------- The ladder ----------------

export type BossState = 'defeated' | 'fix' | 'rematch' | 'open'
export interface Boss {
  key: ReadinessAreaKey
  label: string
  score: number | null
  gate: number
  gap: number
  state: BossState
  lastFight: Fight | null
}
const DEFEAT_DAYS = 7

// Defeated = a fight won in the last 7 days and the area at its gate. A
// lost last fight is 'fix' until its Fix card is read, then 'rematch'.
// Undefeated bosses come first, biggest gap (gate − score, blind spot = 0) first.
export function bossLadder(cells: ReadinessCell[], fights: Fight[], today: string): Boss[] {
  const since = new Date(`${today}T00:00:00Z`)
  since.setUTCDate(since.getUTCDate() - (DEFEAT_DAYS - 1))
  const sinceStr = since.toISOString().slice(0, 10)
  return BOSS_AREAS.map(key => {
    const cell = cells.find(c => c.key === key)
    const gate = GATES[key].gate
    const score = cell?.score ?? null
    const finished = fights.filter(f => f.area === key && (f.status === 'won' || f.status === 'lost'))
      .sort((a, b) => (b.ended_at ?? '').localeCompare(a.ended_at ?? ''))
    const last = finished[0] ?? null
    const won = finished.some(f => f.status === 'won' && f.date >= sinceStr)
    const state: BossState = won && (score ?? 0) >= gate ? 'defeated'
      : last?.status === 'lost' ? (last.fix_read_at ? 'rematch' : 'fix') : 'open'
    return { key, label: cell?.label ?? key, score, gate, gap: gate - (score ?? 0), state, lastFight: last }
  }).sort((a, b) => Number(a.state === 'defeated') - Number(b.state === 'defeated') || b.gap - a.gap)
}

export const bossesLeft = (ladder: Boss[]) => ladder.filter(b => b.state !== 'defeated').length

// Days from today to the deadline (0 = today); null without one.
export function daysTo(target: string | null, today: string): number | null {
  if (!target) return null
  return Math.round((new Date(`${target}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400_000)
}
// "need 0.8/day": bosses left ÷ days left (today counts).
export const bossesPerDay = (left: number, days: number | null) => days === null ? null : Math.round((left / Math.max(1, days + 1)) * 10) / 10

// ---------------- The day's plan ----------------

export function fightBlock(boss: Boss, done: boolean): PrepBlock {
  const coding = CODING_BOSSES.includes(boss.key)
  const n = fightSize(boss.key)
  return {
    key: `fight:${boss.key}`, label: `${boss.state === 'rematch' || boss.state === 'fix' ? 'Rematch' : 'Boss'}: ${boss.label}`, minutes: fightMinutes(boss.key),
    detail: `${coding ? 'One problem in your editor, paste the solution' : `${n} question${n === 1 ? '' : 's'}, timed, no hints`} · win at ${winAt(boss.gate).toFixed(1)} avg, none under ${MIN_ANSWER} · now ${boss.score ?? '—'}/${boss.gate}`,
    href: '/prep?tab=today', done,
  }
}

// Fight slots for the level (including the mock): the biggest-gap boss →
// the mock → a lost boss to rematch (else the next boss) → more bosses.
// Every boss beaten = the final boss, a full loop of three mocks.
export function buildFightPlan(ctx: {
  ladder: Boss[]
  fights: number
  mock: PrepBlock
  finalBoss: PrepBlock[]
  companyBlock: PrepBlock | null
  // Areas with a fight finished today — those blocks start done.
  foughtToday: Set<string>
}): PrepBlock[] {
  const open = ctx.ladder.filter(b => b.state !== 'defeated')
  const lead = ctx.companyBlock ? [ctx.companyBlock] : []
  if (open.length === 0) return [...lead, ...ctx.finalBoss]
  const picks: Boss[] = [open[0]]
  const rematch = open.find(b => b !== open[0] && (b.state === 'rematch' || b.state === 'fix'))
  if (rematch && ctx.fights >= 3) picks.push(rematch)
  for (const b of open) if (picks.length < ctx.fights - 1 && !picks.includes(b)) picks.push(b)
  const blocks = picks.map(b => fightBlock(b, ctx.foughtToday.has(b.key)))
  return [...lead, blocks[0], ctx.mock, ...blocks.slice(1)]
}
