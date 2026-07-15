'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateWeeklyDigest } from './weekly-digest'
import { getModuleRecommendations } from './recommendations'
import { todayIST, daysAgoIST } from '@/lib/date'

// Composes two already-built AI features rather than introducing a new one:
// the weekly digest's score summary (avg Life Score, per-module bars,
// strongest/weakest module, a 3-sentence review) plus one consolidated
// getModuleRecommendations call across all modules at once — a single AI
// call, not one per module, per Product Principle 3 ("AI is a premium
// feature"). No new AI Gateway task needed; both underlying calls already
// route through weekly_digest / module_recommendations.
export async function generateExecutiveSummary(db: SupabaseClient, userId: string): Promise<string> {
  const [digest, context] = await Promise.all([
    generateWeeklyDigest(db, userId),
    buildCrossModuleContext(db, userId),
  ])

  const recs = await getModuleRecommendations('Vinay’s whole life (all modules combined)', context)

  const recsSection = recs.length > 0
    ? `\n\n🎯 *What to focus on next:*\n${recs.map(r => `${r.emoji} ${r.action} — _${r.impact}_`).join('\n')}`
    : ''

  return `${digest}${recsSection}`
}

// Deterministic — a compact cross-module status line, not a summary. Same
// shape as the individual module context strings each web AI advisor
// builds client-side, just server-side and spanning every module at once.
async function buildCrossModuleContext(db: SupabaseClient, userId: string): Promise<string> {
  const today = todayIST()
  const monthStart = today.slice(0, 7) + '-01'
  const since30 = daysAgoIST(30)

  const [tasksRes, appsRes, expensesRes, budgetsRes, resourcesRes, codingRes, healthRes] = await Promise.all([
    db.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('done', false),
    db.from('applications').select('status').eq('user_id', userId),
    db.from('expenses').select('amount').eq('user_id', userId).gte('date', monthStart),
    db.from('budgets').select('amount').eq('user_id', userId).eq('month', today.slice(0, 7)),
    db.from('resources').select('status').eq('user_id', userId),
    db.from('coding_daily_questions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true).gte('assigned_date', since30),
    db.from('health_metrics').select('weight_kg, calories, steps').eq('user_id', userId).eq('date', today).maybeSingle(),
  ])

  const activeApps = (appsRes.data ?? []).filter(a => ['applied', 'screening', 'interview'].includes(a.status as string)).length
  const monthSpend = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const monthBudget = (budgetsRes.data ?? []).reduce((s, b) => s + Number(b.amount), 0)
  const inProgress = (resourcesRes.data ?? []).filter(r => r.status === 'in-progress').length
  const h = healthRes.data

  return `Pending tasks: ${tasksRes.count ?? 0}. Active job applications: ${activeApps}. This month's spend: ₹${Math.round(monthSpend)}${monthBudget > 0 ? ` of ₹${Math.round(monthBudget)} budget` : ' (no budget set)'}. Learning resources in progress: ${inProgress}. Coding questions solved (last 30d): ${codingRes.count ?? 0}. Today's health: ${h ? `weight=${h.weight_kg ?? 'not logged'}kg, calories=${h.calories ?? 'not logged'}, steps=${h.steps ?? 'not logged'}` : 'nothing logged yet'}.`
}
