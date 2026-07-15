import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, istMidnightUtc, toISTDateStr } from '@/lib/date'

export type WorkoutStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface WorkoutExercise {
  name: string
  sets: number
  reps: string
  rest: string
  tempo: string
  rpe: number
  notes: string
}

export interface WorkoutCardio {
  type: string
  duration: string
  intensity: string
  targetHeartRateZone: string
}

export interface Workout {
  id: string
  name: string
  category: string
  difficulty: string
  duration_minutes: number
  estimated_calories: number
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
  environment: string
  warmup: string[]
  exercises: WorkoutExercise[]
  cardio: WorkoutCardio | null
  cooldown: string[]
  coach_tips: string[]
  tags: string[]
}

export interface DailyWorkout {
  id: string
  workout_id: string
  status: WorkoutStatus
  assigned_date: string
  completed_at: string | null
  task_id: string | null
  workout: Workout
}

const HISTORY_LIMIT = 7
// Avoid repeating the same category as the last N completed workouts, so
// muscle groups get proper recovery time before being trained again.
const RECENT_CATEGORY_AVOID_WINDOW = 2

const todayStr = todayIST

// The single active workout — status pending or in_progress. Unlike the
// coding daily-question pattern this is NOT date-scoped: "one active
// workout at a time", not "one per day". A workout stays active across
// days until explicitly completed or skipped.
export async function getActiveWorkout(supabase: SupabaseClient, userId: string): Promise<DailyWorkout | null> {
  const { data } = await supabase
    .from('daily_workouts')
    .select('*, workout:workout_library(*)')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as unknown as DailyWorkout | null) ?? null
}

// The most recently completed workout, if it was completed today. Used to
// keep showing it as "done for the day" instead of generating a fresh one
// on a same-day reload — skipping bypasses this (see generateWorkoutForUser)
// since skipping never leaves a completed-today row behind.
async function getTodayCompleted(supabase: SupabaseClient, userId: string): Promise<DailyWorkout | null> {
  const { data } = await supabase
    .from('daily_workouts')
    .select('*, workout:workout_library(*)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', istMidnightUtc())
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as unknown as DailyWorkout | null) ?? null
}

async function getRecentCompleted(supabase: SupabaseClient, userId: string, limit: number): Promise<DailyWorkout[]> {
  const { data } = await supabase
    .from('daily_workouts')
    .select('*, workout:workout_library(*)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as DailyWorkout[]
}

// Deterministic rotation — no AI. Filters out (a) workouts completed within
// the last HISTORY_LIMIT sessions, so nothing repeats too soon, and (b)
// whatever category was trained in the last RECENT_CATEGORY_AVOID_WINDOW
// sessions, so muscle groups get recovery time. Falls back to progressively
// relaxed filters if the pool would otherwise be empty (55 workouts is
// small enough that over-filtering is a real risk).
function pickNextWorkout(pool: Workout[], recentHistory: DailyWorkout[]): Workout | null {
  if (pool.length === 0) return null

  const recentIds = new Set(recentHistory.slice(0, HISTORY_LIMIT).map(h => h.workout_id))
  const recentCategories = new Set(recentHistory.slice(0, RECENT_CATEGORY_AVOID_WINDOW).map(h => h.workout?.category).filter(Boolean))

  let candidates = pool.filter(w => !recentIds.has(w.id) && !recentCategories.has(w.category))
  if (candidates.length === 0) candidates = pool.filter(w => !recentIds.has(w.id))
  if (candidates.length === 0) candidates = pool

  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  return shuffled[0]
}

export async function generateWorkoutForUser(supabase: SupabaseClient, userId: string): Promise<DailyWorkout | null> {
  const existing = await getActiveWorkout(supabase, userId)
  if (existing) return existing

  const completedToday = await getTodayCompleted(supabase, userId)
  if (completedToday) return completedToday

  const [{ data: pool }, recentHistory] = await Promise.all([
    supabase.from('workout_library').select('*'),
    getRecentCompleted(supabase, userId, HISTORY_LIMIT),
  ])

  const picked = pickNextWorkout((pool ?? []) as Workout[], recentHistory)
  if (!picked) return null

  const { data: task } = await supabase
    .from('tasks')
    .insert({ text: `Workout: ${picked.name}`, priority: 'medium', area: 'Health', user_id: userId, done: false })
    .select('id')
    .single()

  const { data: row } = await supabase
    .from('daily_workouts')
    .insert({ user_id: userId, workout_id: picked.id, assigned_date: todayStr(), status: 'pending', task_id: task?.id ?? null })
    .select('*, workout:workout_library(*)')
    .single()

  return (row as unknown as DailyWorkout | null) ?? null
}

export async function markWorkoutComplete(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: row } = await supabase
    .from('daily_workouts')
    .select('user_id, task_id, workout:workout_library(category, duration_minutes)')
    .eq('id', id)
    .single<{ user_id: string; task_id: string | null; workout: { category: string; duration_minutes: number } }>()
  if (!row) return

  await supabase.from('daily_workouts').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
  if (row.task_id) {
    await supabase.from('tasks').update({ done: true }).eq('id', row.task_id)
  }

  // Feed the existing (simple) workouts log too, so today's Health Score
  // Activity sub-score — which checks `workouts` for a same-day entry —
  // picks this up without needing its own separate calculation path.
  await supabase.from('workouts').insert({
    user_id: row.user_id,
    type: row.workout?.category ?? 'Workout',
    duration_minutes: row.workout?.duration_minutes ?? null,
    notes: 'Logged via Daily Workout Planner',
  })

  // Prune history — only the last HISTORY_LIMIT completed workouts are kept.
  const { data: completedRows } = await supabase
    .from('daily_workouts')
    .select('id')
    .eq('user_id', row.user_id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const excess = (completedRows ?? []).slice(HISTORY_LIMIT)
  if (excess.length > 0) {
    await supabase.from('daily_workouts').delete().in('id', excess.map(r => r.id))
  }
}

// Skipping removes the linked Planner task entirely (not "done" — it wasn't
// actually completed) rather than leaving a stale open task behind.
export async function markWorkoutSkipped(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: row } = await supabase.from('daily_workouts').select('task_id').eq('id', id).single()
  await supabase.from('daily_workouts').update({ status: 'skipped' }).eq('id', id)
  if (row?.task_id) {
    await supabase.from('tasks').delete().eq('id', row.task_id)
  }
}

export async function startWorkout(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from('daily_workouts').update({ status: 'in_progress' }).eq('id', id)
}

export interface WorkoutStats {
  totalCompleted: number
  currentStreakDays: number
  recentCategories: string[]
}

export async function computeWorkoutStats(supabase: SupabaseClient, userId: string): Promise<WorkoutStats> {
  const { data } = await supabase
    .from('daily_workouts')
    .select('completed_at, workout:workout_library(category)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  const rows = (data ?? []) as unknown as { completed_at: string; workout: { category: string } }[]
  const totalCompleted = rows.length
  const recentCategories = rows.map(r => r.workout?.category).filter(Boolean)

  // Streak: consecutive calendar days (walking back from today) with at
  // least one completed workout. IST-based to match todayStr()/assigned_date
  // above — otherwise a workout completed just after IST midnight (still
  // "yesterday" in UTC until 5:30am) would silently break the streak.
  const completedDates = new Set(rows.map(r => r.completed_at ? toISTDateStr(r.completed_at) : null).filter((d): d is string => d !== null))
  let currentStreakDays = 0
  const cursor = new Date(`${todayStr()}T00:00:00Z`)
  for (let i = 0; i < 3650; i++) {
    const d = cursor.toISOString().split('T')[0]
    if (completedDates.has(d)) { currentStreakDays++; cursor.setUTCDate(cursor.getUTCDate() - 1) }
    else if (i === 0) { cursor.setUTCDate(cursor.getUTCDate() - 1) }
    else break
  }

  return { totalCompleted, currentStreakDays, recentCategories }
}
