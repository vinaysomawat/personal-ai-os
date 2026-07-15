'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST, daysAgoIST } from '@/lib/date'
import type { MetricField, ActivityLevel, Gender } from './types'

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

export async function logWorkout(type: string, durationMinutes: number | null, notes: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('workouts').insert({ user_id: user.id, type, duration_minutes: durationMinutes, notes })
  if (error) throw new Error(error.message)
  revalidatePath('/health')
}

export async function deleteWorkout(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/health')
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
  target_weight_kg: number | null
  activity_level: ActivityLevel | null
  workout_days_per_week: number | null
  food_preference: string | null
  goal_deadline: string | null
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
