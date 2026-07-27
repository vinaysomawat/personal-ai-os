import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST, todayIST, istMidnightUtc, toISTHour } from '@/lib/date'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Deterministic pattern checks only (Product Principle 2) — each returns a
// plain-English sentence when a clear pattern exists in the underlying data,
// or null when there isn't enough signal yet. AI is never used to compute
// these, only (elsewhere) to narrate them in a weekly reflection.

async function detectWorkoutDayPattern(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const since = daysAgoIST(90)
  const { data } = await supabase.from('workouts').select('date').eq('user_id', userId).gte('date', since)
  const rows = (data ?? []) as { date: string }[]
  if (rows.length < 4) return null

  const counts = new Array(7).fill(0)
  for (const r of rows) counts[new Date(`${r.date}T00:00:00Z`).getUTCDay()]++

  const total = rows.length
  const maxCount = Math.max(...counts)
  const topDay = counts.indexOf(maxCount)
  if (maxCount >= 3 && maxCount / total >= 0.4) {
    return `You work out mostly on ${DAY_NAMES[topDay]}s (${maxCount} of your last ${total} workouts)`
  }
  return null
}

async function detectProteinWeekendDrop(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const since = daysAgoIST(30)
  const { data } = await supabase
    .from('health_metrics').select('date, protein_g')
    .eq('user_id', userId).gte('date', since).not('protein_g', 'is', null)
  const rows = (data ?? []) as { date: string; protein_g: number }[]
  if (rows.length < 8) return null

  const isWeekend = (d: string) => [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay())
  const weekday = rows.filter(r => !isWeekend(r.date))
  const weekend = rows.filter(r => isWeekend(r.date))
  if (weekday.length < 4 || weekend.length < 2) return null

  const avg = (arr: typeof rows) => arr.reduce((s, r) => s + r.protein_g, 0) / arr.length
  const weekdayAvg = avg(weekday)
  const weekendAvg = avg(weekend)
  if (weekdayAvg > 0 && weekendAvg < weekdayAvg * 0.75) {
    return `Your protein intake drops on weekends — ~${Math.round(weekendAvg)}g vs ~${Math.round(weekdayAvg)}g on weekdays`
  }
  return null
}

// Adds a day to a plain "YYYY-MM-DD" calendar-date string — these columns
// (health_metrics.date, coding_daily_questions.assigned_date) already
// represent IST calendar days per this app's convention, so this is pure
// calendar arithmetic, not a timezone conversion.
function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0]
}

// Phase 3 PRD's "Weekly Pattern Mining" — time-of-day skew in when coding
// questions get solved (completed_at is a timestamptz, so this needs the
// istMidnightUtc/toISTHour instant helpers rather than the plain date-string
// ones the other checks use).
async function detectCodingTimeOfDayPattern(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', istMidnightUtc(60))
  const rows = (data ?? []) as { completed_at: string }[]
  if (rows.length < 6) return null

  const total = rows.length
  const morning = rows.filter(r => toISTHour(r.completed_at) < 12).length
  const evening = total - morning
  if (morning / total >= 0.65) return `You solve more coding problems in the morning (${morning} of your last ${total} solves)`
  if (evening / total >= 0.65) return `You solve more coding problems in the evening (${evening} of your last ${total} solves)`
  return null
}

// Correlates the previous night's sleep with whether that day's coding
// question got solved — the causal direction the PRD's "sleep impacts
// coding performance" example describes.
async function detectSleepCodingPattern(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const since = daysAgoIST(30)
  const [{ data: sleepRows }, { data: codingRows }] = await Promise.all([
    supabase.from('health_metrics').select('date, sleep_hours').eq('user_id', userId).gte('date', since).not('sleep_hours', 'is', null),
    supabase.from('coding_daily_questions').select('assigned_date, completed').eq('user_id', userId).gte('assigned_date', since),
  ])
  const codingByDate = new Map((codingRows ?? []).map(r => [r.assigned_date as string, r.completed as boolean]))

  const solvedNightSleep: number[] = []
  const missedNightSleep: number[] = []
  for (const r of (sleepRows ?? []) as { date: string; sleep_hours: number }[]) {
    const nextDay = addDaysToDateStr(r.date, 1)
    const completed = codingByDate.get(nextDay)
    if (completed === undefined) continue
    (completed ? solvedNightSleep : missedNightSleep).push(Number(r.sleep_hours))
  }
  if (solvedNightSleep.length < 4 || missedNightSleep.length < 4) return null

  const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length
  const solvedAvg = avg(solvedNightSleep)
  const missedAvg = avg(missedNightSleep)
  if (solvedAvg - missedAvg >= 1) {
    return `You solve more coding problems after a good night's sleep — avg ${solvedAvg.toFixed(1)}h before a solved day vs ${missedAvg.toFixed(1)}h before a missed one`
  }
  return null
}

// Correlates workout days with that same day's coding completion rate.
async function detectWorkoutCodingPattern(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const since = daysAgoIST(60)
  const [{ data: workoutRows }, { data: codingRows }] = await Promise.all([
    supabase.from('workouts').select('date').eq('user_id', userId).gte('date', since),
    supabase.from('coding_daily_questions').select('assigned_date, completed').eq('user_id', userId).gte('assigned_date', since),
  ])
  const workoutDays = new Set((workoutRows ?? []).map(r => r.date as string))
  const rows = (codingRows ?? []) as { assigned_date: string; completed: boolean }[]
  if (rows.length < 8 || workoutDays.size < 4) return null

  const onWorkoutDays = rows.filter(r => workoutDays.has(r.assigned_date))
  const onRestDays = rows.filter(r => !workoutDays.has(r.assigned_date))
  if (onWorkoutDays.length < 4 || onRestDays.length < 4) return null

  const rate = (arr: typeof rows) => arr.filter(r => r.completed).length / arr.length
  const workoutRate = rate(onWorkoutDays)
  const restRate = rate(onRestDays)
  if (workoutRate - restRate >= 0.2) {
    return `You solve more coding problems on days you also work out (${Math.round(workoutRate * 100)}% vs ${Math.round(restRate * 100)}% completion)`
  }
  return null
}

// Runs weekly (piggybacks on the existing weekly-digest cron rather than a
// new job). Patterns accumulate: re-detecting the same sentence bumps
// times_confirmed and last_seen on the existing row instead of duplicating —
// per the PRD's "patterns should accumulate over time," not reset each run.
export async function detectPatterns(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const results = await Promise.all([
    detectWorkoutDayPattern(supabase, userId),
    detectProteinWeekendDrop(supabase, userId),
    detectCodingTimeOfDayPattern(supabase, userId),
    detectSleepCodingPattern(supabase, userId),
    detectWorkoutCodingPattern(supabase, userId),
  ])
  const patterns = results.filter((p): p is string => p !== null)

  for (const pattern of patterns) {
    const { data: existing } = await supabase
      .from('brain_patterns').select('times_confirmed')
      .eq('user_id', userId).eq('pattern', pattern).maybeSingle()

    await supabase.from('brain_patterns').upsert(
      { user_id: userId, pattern, last_seen: todayIST(), times_confirmed: (existing?.times_confirmed ?? 0) + 1 },
      { onConflict: 'user_id,pattern' }
    )
  }

  return patterns
}

export interface RecentPattern {
  pattern: string
  timesConfirmed: number
}

// Feeds Ask Brain's context — recent, repeatedly-confirmed patterns only
// (times_confirmed > 1 means it's shown up on more than one weekly run, not
// a one-off), so a fluke doesn't get presented as an established pattern.
// Callers that just need prompt text should `.map(p => p.pattern)` — the
// count is carried through for Dashboard's Today's Insight "seen N× in the
// last 30 days" badge, the one consumer that needs more than the text.
export async function getRecentPatterns(supabase: SupabaseClient, userId: string): Promise<RecentPattern[]> {
  const since = daysAgoIST(30)
  const { data } = await supabase
    .from('brain_patterns').select('pattern, times_confirmed')
    .eq('user_id', userId).gte('last_seen', since).gt('times_confirmed', 1)
    .order('times_confirmed', { ascending: false }).limit(5)
  return (data ?? []).map(r => ({ pattern: r.pattern as string, timesConfirmed: r.times_confirmed as number }))
}
