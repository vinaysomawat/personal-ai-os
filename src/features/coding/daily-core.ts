import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST } from '@/lib/date'

type Difficulty = 'easy' | 'medium' | 'hard'

// Self-reported at completion, the same way time_spent_minutes already is —
// these are open-ended GreatFrontEnd-style problems (a link, not an
// auto-graded judge), so "accuracy" can only ever be what the user reports.
export type Outcome = 'solved' | 'solved_with_help' | 'struggled'

// 'quiz', 'system-design', 'javascript-functions', and 'ui-coding' all share
// this same pool/table rather than a separate one per format (quiz.md's
// generalized-practice scope) — all are link-out only (title/url/difficulty,
// same shape as an algorithm question), so the existing daily-assignment/
// streak/Planner-sync/weak-area/Life-Score machinery already works for them
// with zero changes beyond this field.
export type QuestionCategory = 'algorithm' | 'quiz' | 'system-design' | 'javascript-functions' | 'ui-coding'

export interface CodingQuestion {
  id: string
  title: string
  difficulty: Difficulty
  url: string
  source: string
  topics: string[] | null
  category: QuestionCategory
}

export interface DailyQuestion {
  id: string
  question_id: string
  assigned_date: string
  completed: boolean
  completed_at: string | null
  time_spent_minutes: number | null
  notes: string | null
  rating: number | null
  favorite: boolean
  needs_revision: boolean
  revision_count: number
  outcome: Outcome | null
  task_id: string | null
  question: CodingQuestion
}

export interface CodingSettings {
  mode: 'rotation' | 'fixed'
  fixed_count: number
  telegram_notify: boolean
}

// Weekday index (JS getDay(): 0=Sun...6=Sat) -> difficulty mix. Sunday is a
// revision day (no new questions). Every other day is capped at either one
// medium/hard question, or two easy ones — never two medium/hard in a day.
const ROTATION: Record<number, Difficulty[]> = {
  0: [],
  1: ['easy', 'easy'],
  2: ['medium'],
  3: ['medium'],
  4: ['hard'],
  5: ['medium'],
  6: ['hard'],
}

const todayStr = todayIST

// Any known Saturday works as the anchor — only the parity of weeks-since
// matters, not the specific date. System Design (quiz.md) alternates onto
// the existing Saturday "hard" slot every other week, so there's more time
// to actually work through each one instead of getting a new one weekly.
const SATURDAY_ANCHOR = '2024-01-06'
function isSystemDesignSaturday(todayIso: string): boolean {
  const anchorMs = new Date(`${SATURDAY_ANCHOR}T00:00:00Z`).getTime()
  const todayMs = new Date(`${todayIso}T00:00:00Z`).getTime()
  const weeksSince = Math.floor((todayMs - anchorMs) / (7 * 86400000))
  return weeksSince % 2 === 0
}

async function getSettings(supabase: SupabaseClient, userId: string): Promise<CodingSettings> {
  const { data } = await supabase.from('coding_settings').select('mode, fixed_count, telegram_notify').eq('user_id', userId).single()
  return data ?? { mode: 'rotation', fixed_count: 1, telegram_notify: true }
}

function pickQuestions(pool: CodingQuestion[], assignedIds: Set<string>, difficulty: Difficulty | null, count: number, category: QuestionCategory = 'algorithm'): CodingQuestion[] {
  const byCategory = pool.filter(q => q.category === category)
  const byDifficulty = difficulty ? byCategory.filter(q => q.difficulty === difficulty) : byCategory
  let candidates = byDifficulty.filter(q => !assignedIds.has(q.id))
  if (candidates.length < count) {
    // Pool exhausted for this difficulty — restart the cycle
    candidates = byDifficulty
  }
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function getTodayAssignmentRows(supabase: SupabaseClient, userId: string): Promise<DailyQuestion[]> {
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('*, question:coding_questions(*)')
    .eq('user_id', userId)
    .eq('assigned_date', todayStr())
  return (data ?? []) as unknown as DailyQuestion[]
}

export async function generateAssignmentForUser(supabase: SupabaseClient, userId: string): Promise<DailyQuestion[]> {
  const today = todayStr()

  const existing = await getTodayAssignmentRows(supabase, userId)
  if (existing.length > 0) return existing

  // The check above isn't atomic with the inserts below — concurrent /coding
  // page loads (browser prefetch on the nav link, a reload, dev-server
  // hot-reload) can each pass it before the first request's inserts land,
  // each generating its own duplicate set of picks + Planner tasks (observed
  // in production 2026-08-18: 6 overlapping calls created 12 duplicate rows).
  // `coding_daily_generation_locks` has a unique(user_id, assigned_date) key,
  // so only one concurrent caller can win this insert; everyone else falls
  // back to polling for the winner's rows instead of generating their own.
  const { error: lockError } = await supabase.from('coding_daily_generation_locks').insert({ user_id: userId, assigned_date: today })
  if (lockError) {
    for (let i = 0; i < 10; i++) {
      const rows = await getTodayAssignmentRows(supabase, userId)
      if (rows.length > 0) return rows
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    return []
  }

  const settings = await getSettings(supabase, userId)
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()

  const [{ data: pool }, { data: assignedRows }] = await Promise.all([
    supabase.from('coding_questions').select('*'),
    supabase.from('coding_daily_questions').select('question_id').eq('user_id', userId),
  ])
  const allQuestions = (pool ?? []) as CodingQuestion[]
  const assignedIds = new Set((assignedRows ?? []).map(r => r.question_id as string))

  let picks: CodingQuestion[] = []
  if (settings.mode === 'fixed') {
    picks = pickQuestions(allQuestions, assignedIds, null, settings.fixed_count)
  } else {
    for (const difficulty of ROTATION[weekday]) {
      // Saturday's hard slot alternates onto a System Design pick every
      // other week instead of a random hard algorithm question — same
      // "hard" slot, different pool, off-weeks unaffected.
      const category: QuestionCategory = weekday === 6 && difficulty === 'hard' && isSystemDesignSaturday(today) ? 'system-design' : 'algorithm'
      const [pick] = pickQuestions(allQuestions, assignedIds, category === 'system-design' ? null : difficulty, 1, category)
      if (pick) {
        picks.push(pick)
        assignedIds.add(pick.id) // avoid picking the same question twice in one day
      }
    }
  }

  // One quiz pick every day (all 7), independent of mode/rotation — replaces
  // the old hand-authored MCQ "Today's Quiz" with a real daily question from
  // the same link-out/self-report pattern algorithm questions already use.
  const [quizPick] = pickQuestions(allQuestions, assignedIds, null, 1, 'quiz')
  if (quizPick) {
    picks.push(quizPick)
    assignedIds.add(quizPick.id)
  }

  // One JS-functions pick and one UI-coding pick every day, same independent
  // "always one, regardless of mode/rotation" pattern as the quiz pick above.
  const [jsFunctionsPick] = pickQuestions(allQuestions, assignedIds, null, 1, 'javascript-functions')
  if (jsFunctionsPick) {
    picks.push(jsFunctionsPick)
    assignedIds.add(jsFunctionsPick.id)
  }
  const [uiCodingPick] = pickQuestions(allQuestions, assignedIds, null, 1, 'ui-coding')
  if (uiCodingPick) {
    picks.push(uiCodingPick)
    assignedIds.add(uiCodingPick.id)
  }

  if (picks.length === 0) return []

  const created: DailyQuestion[] = []
  for (const q of picks) {
    const { data: task } = await supabase
      .from('tasks')
      .insert({ text: q.category === 'quiz' ? `Answer today's quiz: ${q.title}` : `Solve ${q.title}`, priority: q.difficulty === 'hard' ? 'high' : 'medium', area: 'Coding', user_id: userId, done: false })
      .select('id')
      .single()

    const { data: row } = await supabase
      .from('coding_daily_questions')
      .insert({ user_id: userId, question_id: q.id, assigned_date: today, task_id: task?.id ?? null })
      .select('*, question:coding_questions(*)')
      .single()

    if (row) created.push(row as unknown as DailyQuestion)
  }

  return created
}

export interface CodingStats {
  currentStreak: number
  longestStreak: number
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  completionRate: number
}

export async function computeCodingStats(supabase: SupabaseClient, userId: string): Promise<CodingStats> {
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('assigned_date, completed, question:coding_questions(difficulty)')
    .eq('user_id', userId)

  const rows = (data ?? []) as unknown as { assigned_date: string; completed: boolean; question: { difficulty: Difficulty } }[]

  const totalSolved = rows.filter(r => r.completed).length
  const easySolved = rows.filter(r => r.completed && r.question?.difficulty === 'easy').length
  const mediumSolved = rows.filter(r => r.completed && r.question?.difficulty === 'medium').length
  const hardSolved = rows.filter(r => r.completed && r.question?.difficulty === 'hard').length
  const completionRate = rows.length ? Math.round((totalSolved / rows.length) * 100) : 0

  // Streak: consecutive days (walking back from today) with at least one completed question
  const completedDates = new Set(rows.filter(r => r.completed).map(r => r.assigned_date))
  let currentStreak = 0
  const cursor = new Date(`${todayStr()}T00:00:00Z`)
  for (let i = 0; i < 3650; i++) {
    const d = cursor.toISOString().split('T')[0]
    if (completedDates.has(d)) { currentStreak++; cursor.setUTCDate(cursor.getUTCDate() - 1) }
    else if (i === 0) { cursor.setUTCDate(cursor.getUTCDate() - 1) } // allow today to be pending without breaking the streak
    else break
  }

  const sortedDates = [...completedDates].sort()
  let longestStreak = 0, run = 0, prev: string | null = null
  for (const d of sortedDates) {
    if (prev) {
      const diff = (new Date(d).getTime() - new Date(prev).getTime()) / 86400000
      run = diff === 1 ? run + 1 : 1
    } else run = 1
    longestStreak = Math.max(longestStreak, run)
    prev = d
  }

  return { currentStreak, longestStreak, totalSolved, easySolved, mediumSolved, hardSolved, completionRate }
}

export interface WeakArea {
  topic: string
  strugglingCount: number
  total: number
  struggleRate: number
}

// Deterministic (Product Principle 2) — a topic is only surfaced once it has
// at least 2 outcomes logged, so one rough question doesn't brand a whole
// topic "weak" off a single data point. A question can carry multiple
// topics, so it contributes to each. Sorted worst-first; feeds both the AI
// recommendation prompt and the auto-revision-flagging rule below.
export function computeWeakAreas(history: DailyQuestion[], minSample = 2): WeakArea[] {
  const byTopic = new Map<string, { struggling: number; total: number }>()
  for (const row of history) {
    if (!row.completed || !row.outcome) continue
    for (const topic of row.question.topics ?? []) {
      const entry = byTopic.get(topic) ?? { struggling: 0, total: 0 }
      entry.total++
      if (row.outcome !== 'solved') entry.struggling++
      byTopic.set(topic, entry)
    }
  }
  return [...byTopic.entries()]
    .filter(([, v]) => v.total >= minSample)
    .map(([topic, v]) => ({ topic, strugglingCount: v.struggling, total: v.total, struggleRate: Math.round((v.struggling / v.total) * 100) }))
    .sort((a, b) => b.struggleRate - a.struggleRate)
}

// Auto-detected complement to the manual `needs_revision` toggle — same 14-day
// idle rule as Learning's getResourcesNeedingRevision, adapted for the fact
// that a question can be re-assigned and re-solved after the rotation pool
// cycles (README §7), so multiple rows can share one question_id. Dedupe by
// question_id and use each question's *latest* solve, not any historical row,
// so a question re-solved recently doesn't stay flagged from an old row.
export function getStaleRevisionCount(
  rows: { question_id: string; completed: boolean; completed_at: string | null }[],
  days = 14
): number {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  const latestByQuestion = new Map<string, string>()
  for (const r of rows) {
    if (!r.completed || !r.completed_at) continue
    const prev = latestByQuestion.get(r.question_id)
    if (!prev || r.completed_at > prev) latestByQuestion.set(r.question_id, r.completed_at)
  }
  return [...latestByQuestion.values()].filter(d => d < cutoff).length
}

interface CalendarDayQuestion {
  title: string
  difficulty: Difficulty
  completed: boolean
}

export interface CalendarDay {
  date: string
  status: 'solved' | 'partial' | 'missed' | 'none'
  questions: CalendarDayQuestion[]
}

export async function computeCodingCalendar(supabase: SupabaseClient, userId: string, days = 182): Promise<CalendarDay[]> {
  const since = daysAgoIST(days)
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('assigned_date, completed, question:coding_questions(title, difficulty)')
    .eq('user_id', userId)
    .gte('assigned_date', since)

  // PostgREST embeds a many-to-one relation (many daily_questions -> one
  // coding_questions row) as a single object, not an array — the Supabase
  // client's generated types disagree and infer an array here regardless,
  // so this cast goes through `unknown` to override that.
  const rows = (data ?? []) as unknown as { assigned_date: string; completed: boolean; question: { title: string; difficulty: Difficulty } | null }[]
  const byDate = new Map<string, { total: number; done: number; questions: CalendarDayQuestion[] }>()
  for (const r of rows) {
    const entry = byDate.get(r.assigned_date) ?? { total: 0, done: 0, questions: [] }
    entry.total++
    if (r.completed) entry.done++
    if (r.question) entry.questions.push({ title: r.question.title, difficulty: r.question.difficulty, completed: r.completed })
    byDate.set(r.assigned_date, entry)
  }

  const today = todayStr()
  const result: CalendarDay[] = []
  for (let i = 0; i < days; i++) {
    const d = daysAgoIST(i)
    const entry = byDate.get(d)
    let status: CalendarDay['status'] = 'none'
    if (entry) {
      if (entry.done === entry.total) status = 'solved'
      else if (entry.done > 0) status = 'partial'
      else status = d < today ? 'missed' : 'none'
    }
    result.push({ date: d, status, questions: entry?.questions ?? [] })
  }
  return result.reverse()
}
