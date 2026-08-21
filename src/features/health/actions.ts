'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST, daysAgoIST } from '@/lib/date'
import { getDailyTip } from '@/lib/daily-tip'
import type { MetricField, ActivityLevel, Gender } from './types'

// Same deterministic, idempotent-per-day pick the `health-tip` cron sends
// to Telegram (src/lib/daily-tip.ts) — reading it here just surfaces
// whatever tip is (or will be) assigned for today, no separate logic.
export async function getTodaysHealthTip(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return getDailyTip(supabase, user.id, 'health')
}

export async function getHealthMetrics(days = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const from = daysAgoIST(days)
  const { data } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .order('date', { ascending: false })

  return data ?? []
}

export async function upsertTodayMetric(field: MetricField, value: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = todayIST()
  await supabase.from('health_metrics').upsert(
    { user_id: user.id, date: today, [field]: value },
    { onConflict: 'user_id,date' }
  )
  revalidatePath('/health')
}

export async function getTodaysWorkouts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = todayIST()
  const { data } = await supabase.from('workouts').select('*').eq('user_id', user.id).eq('date', today).order('created_at', { ascending: false })
  return data ?? []
}

interface CalendarDayWorkout {
  type: string
  durationMinutes: number | null
}

export interface WorkoutCalendarDay {
  date: string
  status: 'done' | 'missed' | 'none'
  workouts: CalendarDayWorkout[]
}

// Same shape/pattern as Coding's computeCodingCalendar and Learning's
// computeStudyCalendar. Only Done/Missed — no "Rest" status, since workouts
// are logged ad-hoc with no assigned/expected day to compare against
// (daily_workouts is "one active workout at a time," not "one per
// calendar day," per workout-core.ts) and there's no per-user rest-day
// schedule stored anywhere, so a real Rest/Missed distinction isn't
// derivable from the data. The simple `workouts` table (not
// `daily_workouts`) is the source of truth here — completing a
// daily_workouts row already mirrors into `workouts` (workout-core.ts's
// markWorkoutComplete), so this reads one table, same as the Health Score
// Activity sub-score does.
export async function computeWorkoutCalendar(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, days = 182): Promise<WorkoutCalendarDay[]> {
  const since = daysAgoIST(days)
  const { data } = await supabase
    .from('workouts')
    .select('date, type, duration_minutes')
    .eq('user_id', userId)
    .gte('date', since)

  const rows = (data ?? []) as { date: string; type: string; duration_minutes: number | null }[]
  const byDate = new Map<string, CalendarDayWorkout[]>()
  for (const r of rows) {
    const entry = byDate.get(r.date) ?? []
    entry.push({ type: r.type, durationMinutes: r.duration_minutes })
    byDate.set(r.date, entry)
  }

  const today = todayIST()
  const result: WorkoutCalendarDay[] = []
  for (let i = 0; i < days; i++) {
    const d = daysAgoIST(i)
    const workouts = byDate.get(d) ?? []
    const status: WorkoutCalendarDay['status'] = workouts.length > 0 ? 'done' : d < today ? 'missed' : 'none'
    result.push({ date: d, status, workouts })
  }
  return result.reverse()
}

export async function getHealthCalendarData(days = 182): Promise<WorkoutCalendarDay[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return computeWorkoutCalendar(supabase, user.id, days)
}

export async function getHealthProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('health_profile').select('*').eq('user_id', user.id).single()
  return data
}

export async function upsertHealthProfile(profile: {
  age: number | null
  gender: Gender | null
  height_cm: number | null
  activity_level: ActivityLevel | null
  workout_days_per_week: number | null
  food_preference: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('health_profile').upsert(
    { user_id: user.id, ...profile, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath('/health')
}
