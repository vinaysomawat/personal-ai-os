'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  generateAssignmentForUser, computeCodingStats, computeCodingCalendar,
} from './daily-core'
import type { CodingSettings } from './daily-core'

export async function getTodayAssignment() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return generateAssignmentForUser(supabase, user.id)
}

export async function markQuestionComplete(id: string, extra?: { timeSpentMinutes?: number; notes?: string; rating?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: row } = await supabase.from('coding_daily_questions').select('task_id').eq('id', id).single()

  const { error } = await supabase.from('coding_daily_questions').update({
    completed: true,
    completed_at: new Date().toISOString(),
    time_spent_minutes: extra?.timeSpentMinutes ?? null,
    notes: extra?.notes ?? null,
    rating: extra?.rating ?? null,
  }).eq('id', id)
  if (error) throw new Error(error.message)

  if (row?.task_id) {
    await supabase.from('tasks').update({ done: true }).eq('id', row.task_id)
  }

  revalidatePath('/coding')
  revalidatePath('/planner')
  revalidatePath('/dashboard')
}

export async function toggleRevisionFlag(id: string) {
  const supabase = await createClient()
  const { data: row } = await supabase.from('coding_daily_questions').select('needs_revision').eq('id', id).single()
  const { error } = await supabase.from('coding_daily_questions').update({ needs_revision: !row?.needs_revision }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/coding')
}

export async function toggleFavorite(id: string) {
  const supabase = await createClient()
  const { data: row } = await supabase.from('coding_daily_questions').select('favorite').eq('id', id).single()
  const { error } = await supabase.from('coding_daily_questions').update({ favorite: !row?.favorite }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/coding')
}

export async function getCodingStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { currentStreak: 0, longestStreak: 0, totalSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, completionRate: 0 }
  return computeCodingStats(supabase, user.id)
}

export async function getCodingCalendarData(days = 182) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return computeCodingCalendar(supabase, user.id, days)
}

export async function getCodingSettings(): Promise<CodingSettings> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { mode: 'rotation', fixed_count: 1, telegram_notify: true }
  const { data } = await supabase.from('coding_settings').select('mode, fixed_count, telegram_notify').eq('user_id', user.id).single()
  return data ?? { mode: 'rotation', fixed_count: 1, telegram_notify: true }
}

export async function upsertCodingSettings(settings: CodingSettings) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('coding_settings').upsert(
    { user_id: user.id, ...settings, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath('/coding')
}

export async function getAssignmentHistory(limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('*, question:coding_questions(*)')
    .eq('user_id', user.id)
    .order('assigned_date', { ascending: false })
    .limit(limit)
  return data ?? []
}
