import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST, todayIST } from '@/lib/date'
import { computeHealthPlan } from '@/features/health/calculations'
import { computeCodingStats } from '@/features/coding/daily-core'
import type { HealthProfile, HealthMetric } from '@/features/health/types'

export interface Risk {
  kind: 'budget_pace' | 'protein_decline' | 'coding_streak'
  text: string
  impact: 'high' | 'medium' | 'low'
  action: string
}

export interface Opportunity {
  kind: 'interview_momentum'
  text: string
}

export const IMPACT_EMOJI: Record<Risk['impact'], string> = { high: '🔴', medium: '🟠', low: '🟡' }

// Risk Engine (Phase 4 PRD) — forward-looking, deterministic-only (Product
// Principle 2). No fabricated probability numbers: severity is expressed as
// a plain impact tier grounded in real thresholds, never an invented
// statistic. Shared by the daily-briefing cron (Telegram) and the Executive
// Dashboard (in-app), so both surfaces agree — extracted here rather than
// left inline in the cron route once the Dashboard needed the same checks.
export async function computeRiskEngine(supabase: SupabaseClient, userId: string): Promise<Risk[]> {
  const today = todayIST()
  const [{ data: expenses }, { data: budgets }, { data: metrics }, { data: todayCoding }, codingStats] = await Promise.all([
    supabase.from('expenses').select('amount').eq('user_id', userId).gte('date', today.slice(0, 7) + '-01'),
    supabase.from('budgets').select('amount').eq('user_id', userId).eq('month', today.slice(0, 7)),
    supabase.from('health_metrics').select('date, protein_g').eq('user_id', userId).gte('date', daysAgoIST(6)).not('protein_g', 'is', null),
    supabase.from('coding_daily_questions').select('completed').eq('user_id', userId).eq('assigned_date', today),
    computeCodingStats(supabase, userId),
  ])

  const risks: Risk[] = []

  // Risk: on pace to exceed this month's budget.
  const monthBudget = (budgets ?? []).reduce((s, b) => s + Number(b.amount ?? 0), 0)
  const monthSpend = (expenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  if (monthBudget > 0) {
    const [year, month, day] = today.split('-').map(Number)
    const daysElapsed = day
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const projectedSpend = (monthSpend / daysElapsed) * daysInMonth
    const overBy = projectedSpend - monthBudget
    if (overBy / monthBudget >= 0.05) {
      const ratio = overBy / monthBudget
      risks.push({
        kind: 'budget_pace',
        text: `At your current pace (₹${Math.round(monthSpend / daysElapsed).toLocaleString('en-IN')}/day), you're projected to spend ₹${Math.round(projectedSpend).toLocaleString('en-IN')} this month — ₹${Math.round(overBy).toLocaleString('en-IN')} over your ₹${Math.round(monthBudget).toLocaleString('en-IN')} budget.`,
        impact: ratio >= 0.25 ? 'high' : ratio >= 0.15 ? 'medium' : 'low',
        action: 'Pull back discretionary spending for the rest of the month.',
      })
    }
  }

  // Risk: protein intake declining over the last few days.
  const proteinRows = (metrics ?? []) as { date: string; protein_g: number }[]
  if (proteinRows.length >= 6) {
    const sorted = [...proteinRows].sort((a, b) => a.date.localeCompare(b.date))
    const recent3 = sorted.slice(-3)
    const prior3 = sorted.slice(-6, -3)
    if (recent3.length === 3 && prior3.length === 3) {
      const avg = (arr: typeof sorted) => arr.reduce((s, r) => s + r.protein_g, 0) / arr.length
      const recentAvg = avg(recent3)
      const priorAvg = avg(prior3)
      if (priorAvg > 0 && (priorAvg - recentAvg) / priorAvg >= 0.2) {
        risks.push({
          kind: 'protein_decline',
          text: `Protein intake has declined from ~${Math.round(priorAvg)}g to ~${Math.round(recentAvg)}g avg over the last 3 days.`,
          impact: 'medium',
          action: 'Add a protein-heavy meal today to reverse the trend.',
        })
      }
    }
  }

  // Risk: coding streak open for today.
  const todayRows = (todayCoding ?? []) as { completed: boolean }[]
  const todayOpen = todayRows.length > 0 && todayRows.every(r => !r.completed)
  if (todayOpen && codingStats.currentStreak > 0) {
    risks.push({
      kind: 'coding_streak',
      text: `You have a ${codingStats.currentStreak}-day coding streak, and today's question isn't solved yet.`,
      impact: codingStats.currentStreak >= 7 ? 'high' : 'medium',
      action: "Solve today's question to keep the streak alive.",
    })
  }

  return risks
}

// Automation Rules (Phase 3 PRD) — deterministic "if X then suggest Y"
// checks. Same extraction/sharing rationale as computeRiskEngine above.
export async function computeAutomationRules(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const yesterday = daysAgoIST(1)
  const [{ data: profile }, { data: metrics }, { data: interviewApps }] = await Promise.all([
    supabase.from('health_profile').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('health_metrics').select('*').eq('user_id', userId).gte('date', daysAgoIST(14)).order('date', { ascending: false }),
    supabase.from('applications').select('id').eq('user_id', userId).eq('status', 'interview'),
  ])

  const lines: string[] = []

  // Rule: high calorie yesterday → adjust today's guidance. Reuses the same
  // computeHealthPlan the Health page and bot already use for daily targets —
  // no separate calorie-target calculation.
  const yesterdayMetric = (metrics ?? []).find((m): m is HealthMetric => m.date === yesterday)
  const plan = computeHealthPlan(profile as HealthProfile | null, (metrics ?? []) as HealthMetric[], [], yesterday)
  if (plan && yesterdayMetric?.calories) {
    const target = plan.dailyTargets.dailyCalorieTarget
    const overBy = yesterdayMetric.calories - target
    if (target > 0 && overBy / target >= 0.15) {
      lines.push(`🍽️ Yesterday you were ~${Math.round(overBy)} kcal over target (${yesterdayMetric.calories} vs ${target}) — lighter meals today will help stay on track this week.`)
    }
  }

  // Rule: active interview-stage application → suggest lighter workout + more revision.
  if ((interviewApps ?? []).length > 0) {
    lines.push(`🎯 You have an active interview-stage application — consider a lighter workout and extra revision time today.`)
  }

  return lines
}

// Opportunity Engine (Phase 4 PRD) — the positive-signal counterpart to the
// Risk Engine. Only one of the PRD's four examples is buildable without an
// integration: "free Saturday → book a trek" and "salary credited → invest"
// need Calendar/Gmail (same blockers noted throughout Phase 3); "three weeks
// without leave" needs leave-tracking that doesn't exist anywhere in the app.
export async function computeOpportunityEngine(supabase: SupabaseClient, userId: string): Promise<Opportunity[]> {
  const { data: interviewApps } = await supabase.from('applications').select('id').eq('user_id', userId).eq('status', 'interview')
  const count = (interviewApps ?? []).length

  const opportunities: Opportunity[] = []
  // Opportunity: interview-invite surge → capitalize with extra practice,
  // distinct from Automation Rules' single-application "lighter workout"
  // suggestion — this is momentum to lean into, not a load to offset.
  if (count >= 3) {
    opportunities.push({
      kind: 'interview_momentum',
      text: `You have ${count} active interview-stage applications — strong momentum. Consider batch-scheduling extra interview practice sessions this week to capitalize on it.`,
    })
  }

  return opportunities
}
