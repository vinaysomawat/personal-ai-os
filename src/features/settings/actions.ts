'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAiBudgetLimits } from '@/lib/ai-gateway'
import type { ReminderSlot } from './types'

export async function getReminders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function addReminder(label: string, slot: ReminderSlot, module: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('reminders').insert({ user_id: user.id, label, slot, module })
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function deleteReminder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function getAiBudgetStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { dailyBudget, monthlyBudget } = await getAiBudgetLimits()
  if (!user) return { dailyBudget, monthlyBudget, spentToday: 0, spentThisMonth: 0 }

  const now = new Date()
  const todayStart = new Date(now).toISOString().split('T')[0] + 'T00:00:00.000Z'
  const monthStart = now.toISOString().slice(0, 7) + '-01T00:00:00.000Z'

  const { data } = await supabase
    .from('ai_usage_logs')
    .select('estimated_cost_usd, created_at')
    .eq('user_id', user.id)
    .gte('created_at', monthStart)

  const rows = data ?? []
  const spentThisMonth = rows.reduce((s, r) => s + Number(r.estimated_cost_usd), 0)
  const spentToday = rows.filter(r => (r.created_at as string) >= todayStart).reduce((s, r) => s + Number(r.estimated_cost_usd), 0)

  return { dailyBudget, monthlyBudget, spentToday, spentThisMonth }
}

// Deterministic — a full backup of everything you've entered, grouped by
// module. No AI involved; this is a data dump, not a summary.
export async function exportAllData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const uid = user.id
  const [
    tasks, applications, careerProfile, skills, interviewQa,
    expenses, budgets, financeProfile, salaryHistory, loans, investments, financialGoals,
    healthMetrics, healthProfile, workouts,
    resources, studyLogs,
    codingQuestions, codingSettings,
    documents, reminders,
    lifeScoreLogs, userXp,
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', uid),
    supabase.from('applications').select('*').eq('user_id', uid),
    supabase.from('career_profile').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('skills').select('*').eq('user_id', uid),
    supabase.from('interview_qa').select('*').eq('user_id', uid),
    supabase.from('expenses').select('*').eq('user_id', uid),
    supabase.from('budgets').select('*').eq('user_id', uid),
    supabase.from('finance_profile').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('salary_history').select('*').eq('user_id', uid),
    supabase.from('loans').select('*').eq('user_id', uid),
    supabase.from('investments').select('*').eq('user_id', uid),
    supabase.from('financial_goals').select('*').eq('user_id', uid),
    supabase.from('health_metrics').select('*').eq('user_id', uid),
    supabase.from('health_profile').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('workouts').select('*').eq('user_id', uid),
    supabase.from('resources').select('*').eq('user_id', uid),
    supabase.from('study_logs').select('*').eq('user_id', uid),
    supabase.from('coding_daily_questions').select('*, question:coding_questions(*)').eq('user_id', uid),
    supabase.from('coding_settings').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('documents').select('*').eq('user_id', uid),
    supabase.from('reminders').select('*').eq('user_id', uid),
    supabase.from('life_score_logs').select('*').eq('user_id', uid),
    supabase.from('user_xp').select('*').eq('user_id', uid).maybeSingle(),
  ])

  return {
    exported_at: new Date().toISOString(),
    account: { email: user.email },
    planner: { tasks: tasks.data ?? [] },
    career: {
      applications: applications.data ?? [], profile: careerProfile.data ?? null,
      skills: skills.data ?? [], interview_qa: interviewQa.data ?? [],
    },
    finance: {
      expenses: expenses.data ?? [], budgets: budgets.data ?? [], profile: financeProfile.data ?? null,
      salary_history: salaryHistory.data ?? [], loans: loans.data ?? [],
      investments: investments.data ?? [], goals: financialGoals.data ?? [],
    },
    health: {
      metrics: healthMetrics.data ?? [], profile: healthProfile.data ?? null, workouts: workouts.data ?? [],
    },
    learning: { resources: resources.data ?? [], study_logs: studyLogs.data ?? [] },
    coding: { question_history: codingQuestions.data ?? [], settings: codingSettings.data ?? null },
    documents: documents.data ?? [],
    reminders: reminders.data ?? [],
    history: { life_score_logs: lifeScoreLogs.data ?? [], xp: userXp.data ?? null },
  }
}
