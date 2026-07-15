import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST } from '@/lib/date'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface CodingQuestion {
  id: string
  title: string
  difficulty: Difficulty
  url: string
  source: string
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

async function getSettings(supabase: SupabaseClient, userId: string): Promise<CodingSettings> {
  const { data } = await supabase.from('coding_settings').select('mode, fixed_count, telegram_notify').eq('user_id', userId).single()
  return data ?? { mode: 'rotation', fixed_count: 1, telegram_notify: true }
}

function pickQuestions(pool: CodingQuestion[], assignedIds: Set<string>, difficulty: Difficulty | null, count: number): CodingQuestion[] {
  const byDifficulty = difficulty ? pool.filter(q => q.difficulty === difficulty) : pool
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
      const [pick] = pickQuestions(allQuestions, assignedIds, difficulty, 1)
      if (pick) {
        picks.push(pick)
        assignedIds.add(pick.id) // avoid picking the same question twice in one day
      }
    }
  }

  if (picks.length === 0) return []

  const created: DailyQuestion[] = []
  for (const q of picks) {
    const { data: task } = await supabase
      .from('tasks')
      .insert({ text: `Solve ${q.title}`, priority: q.difficulty === 'hard' ? 'high' : 'medium', area: 'Coding', user_id: userId, done: false })
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

export interface CalendarDay {
  date: string
  status: 'solved' | 'partial' | 'missed' | 'none'
}

export async function computeCodingCalendar(supabase: SupabaseClient, userId: string, days = 182): Promise<CalendarDay[]> {
  const since = daysAgoIST(days)
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('assigned_date, completed')
    .eq('user_id', userId)
    .gte('assigned_date', since)

  const rows = (data ?? []) as { assigned_date: string; completed: boolean }[]
  const byDate = new Map<string, { total: number; done: number }>()
  for (const r of rows) {
    const entry = byDate.get(r.assigned_date) ?? { total: 0, done: 0 }
    entry.total++
    if (r.completed) entry.done++
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
    result.push({ date: d, status })
  }
  return result.reverse()
}
