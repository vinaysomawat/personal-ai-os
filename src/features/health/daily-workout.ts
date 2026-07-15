'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  generateWorkoutForUser, markWorkoutComplete, markWorkoutSkipped, startWorkout, computeWorkoutStats,
} from './workout-core'

export async function getActiveOrGenerateWorkout() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return generateWorkoutForUser(supabase, user.id)
}

export async function completeWorkout(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await markWorkoutComplete(supabase, id)
  revalidatePath('/health')
  revalidatePath('/planner')
  revalidatePath('/dashboard')
}

export async function skipWorkout(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await markWorkoutSkipped(supabase, id)
  revalidatePath('/health')
  revalidatePath('/planner')
  revalidatePath('/dashboard')
}

export async function beginWorkout(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await startWorkout(supabase, id)
  revalidatePath('/health')
}

export async function getWorkoutStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalCompleted: 0, currentStreakDays: 0, recentCategories: [] }
  return computeWorkoutStats(supabase, user.id)
}
