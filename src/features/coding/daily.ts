'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import {
  generateAssignmentForUser, computeCodingStats, computeCodingCalendar, swapCodingQuestion,
} from './daily-core'
import type { CodingSettings, Outcome, CodingQuestion, DailyQuestion } from './daily-core'

export async function getTodayAssignment() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return generateAssignmentForUser(supabase, user.id)
}

// Swap an unwanted open pick for a fresh one of the same type; returns the
// new active set.
export async function swapQuestion(id: string): Promise<DailyQuestion[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const rows = await swapCodingQuestion(supabase, user.id, id)
  revalidatePath('/coding')
  revalidatePath('/planner')
  revalidatePath('/dashboard')
  return rows
}

export async function markQuestionComplete(id: string, extra?: { timeSpentMinutes?: number; notes?: string; rating?: number; outcome?: Outcome }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: row } = await supabase.from('coding_daily_questions').select('task_id, revision_count').eq('id', id).single()

  // A struggled outcome auto-flags this specific question for revision —
  // one bad outcome is reason enough to want to see it again, unlike the
  // topic-level "weak area" signal (computeWeakAreas) which deliberately
  // waits for a pattern across multiple questions before calling a topic weak.
  const autoRevision = extra?.outcome === 'struggled'

  const { error } = await supabase.from('coding_daily_questions').update({
    completed: true,
    completed_at: new Date().toISOString(),
    time_spent_minutes: extra?.timeSpentMinutes ?? null,
    notes: extra?.notes ?? null,
    rating: extra?.rating ?? null,
    outcome: extra?.outcome ?? null,
    ...(autoRevision ? { needs_revision: true, revision_count: (row?.revision_count ?? 0) + 1 } : {}),
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
  const { data: row } = await supabase.from('coding_daily_questions').select('needs_revision, revision_count').eq('id', id).single()
  const turningOn = !row?.needs_revision
  const { error } = await supabase.from('coding_daily_questions').update({
    needs_revision: turningOn,
    ...(turningOn ? { revision_count: (row?.revision_count ?? 0) + 1 } : {}),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/coding')
}

// Fetches a much wider window than getAssignmentHistory's display-capped 30
// rows — weak-area/difficulty-progression trends need real history, not
// just what the Practice Log list shows.
export async function getInsightsHistory(): Promise<DailyQuestion[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('coding_daily_questions')
    .select('*, question:coding_questions(*)')
    .eq('user_id', user.id)
    .order('assigned_date', { ascending: false })
    .limit(500)
  return (data ?? []) as unknown as DailyQuestion[]
}

// Reuses Career's JD analysis (Stage B) as a company-specific signal when
// there's an active application with one already computed — Product
// Principle 4 ("modules should connect"). Gracefully returns null when
// there's no active application or it hasn't been analyzed yet.
export async function getActiveCompanyPriorityTopics(): Promise<{ company: string; topics: string[] } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('applications')
    .select('company, jd_analysis, applied_at')
    .eq('user_id', user.id)
    .in('status', ['applied', 'screening', 'interview'])
    .not('jd_analysis', 'is', null)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.jd_analysis) return null
  const topics = (data.jd_analysis as { priorityTopics?: string[] }).priorityTopics
  if (!topics?.length) return null
  return { company: data.company as string, topics }
}

// Mirrors generateAssignmentForUser's insert logic for one specific
// question — used by the AI-recommended picks (added deliberately, not
// auto-assigned, since these are suggestions the user chooses from).
export async function addRecommendedQuestion(question: CodingQuestion) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: task } = await supabase
    .from('tasks')
    .insert({ text: `Solve ${question.title}`, priority: question.difficulty === 'hard' ? 'high' : 'medium', area: 'Coding', user_id: user.id, done: false })
    .select('id')
    .single()

  const { error } = await supabase
    .from('coding_daily_questions')
    .insert({ user_id: user.id, question_id: question.id, assigned_date: todayIST(), task_id: task?.id ?? null })
  if (error) throw new Error(error.message)

  revalidatePath('/coding')
  revalidatePath('/planner')
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
