import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST, todayIST } from '@/lib/date'
import { projectMonthSpend } from '@/features/finance/calculations'
import { RISK_THRESHOLDS, OPPORTUNITY_THRESHOLDS } from '@/lib/thresholds'

export interface Risk {
  kind: 'budget_pace' | 'protein_decline'
  text: string
  impact: 'high' | 'medium' | 'low'
  action: string
}

export interface Opportunity {
  kind: 'interview_momentum'
  text: string
  action: string
}

export const IMPACT_EMOJI: Record<Risk['impact'], string> = { high: '🔴', medium: '🟠', low: '🟡' }

// Risk Engine — forward-looking, deterministic-only (Product Principle 2).
// No fabricated probability numbers: severity is a plain impact tier
// grounded in real thresholds. Consumed by the Dashboard's Needs Attention
// (via getExecutiveData) and its Top Priority banner.
export async function computeRiskEngine(supabase: SupabaseClient, userId: string): Promise<Risk[]> {
  const today = todayIST()
  const [{ data: expenses }, { data: budgets }, { data: metrics }] = await Promise.all([
    supabase.from('expenses').select('amount, category').eq('user_id', userId).gte('date', today.slice(0, 7) + '-01'),
    supabase.from('budgets').select('amount').eq('user_id', userId).eq('month', today.slice(0, 7)),
    supabase.from('health_metrics').select('date, protein_g').eq('user_id', userId).gte('date', daysAgoIST(RISK_THRESHOLDS.proteinDeclineLookbackDays)).not('protein_g', 'is', null),
  ])

  const risks: Risk[] = []

  // Risk: on pace to exceed this month's budget.
  const monthBudget = (budgets ?? []).reduce((s, b) => s + Number(b.amount ?? 0), 0)
  if (monthBudget > 0) {
    // Shared with the Finance page's pace strip so both report the same
    // projection — a lump EMI counts once, not extrapolated per-day.
    const { daysInMonth, projected: projectedSpend } = projectMonthSpend(expenses ?? [], today)
    const overBy = projectedSpend - monthBudget
    if (overBy / monthBudget >= RISK_THRESHOLDS.budgetOverageMinRatio) {
      const ratio = overBy / monthBudget
      risks.push({
        kind: 'budget_pace',
        text: `At your current pace (₹${Math.round(projectedSpend / daysInMonth).toLocaleString('en-IN')}/day), you're projected to spend ₹${Math.round(projectedSpend).toLocaleString('en-IN')} this month — ₹${Math.round(overBy).toLocaleString('en-IN')} over your ₹${Math.round(monthBudget).toLocaleString('en-IN')} budget.`,
        impact: ratio >= RISK_THRESHOLDS.budgetOverageHighImpactRatio ? 'high' : ratio >= RISK_THRESHOLDS.budgetOverageMediumImpactRatio ? 'medium' : 'low',
        action: 'Pull back discretionary spending for the rest of the month.',
      })
    }
  }

  // Risk: protein intake declining over the last few days.
  const proteinRows = (metrics ?? []) as { date: string; protein_g: number }[]
  const { proteinDeclineLookbackDays: lookback, proteinDeclineWindowDays: window } = RISK_THRESHOLDS
  if (proteinRows.length >= lookback) {
    const sorted = [...proteinRows].sort((a, b) => a.date.localeCompare(b.date))
    const recent3 = sorted.slice(-window)
    const prior3 = sorted.slice(-lookback, -window)
    if (recent3.length === window && prior3.length === window) {
      const avg = (arr: typeof sorted) => arr.reduce((s, r) => s + r.protein_g, 0) / arr.length
      const recentAvg = avg(recent3)
      const priorAvg = avg(prior3)
      if (priorAvg > 0 && (priorAvg - recentAvg) / priorAvg >= RISK_THRESHOLDS.proteinDeclineMinRatio) {
        risks.push({
          kind: 'protein_decline',
          text: `Protein intake has declined from ~${Math.round(priorAvg)}g to ~${Math.round(recentAvg)}g avg over the last 3 days.`,
          impact: 'medium',
          action: 'Add a protein-heavy meal today to reverse the trend.',
        })
      }
    }
  }

  return risks
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
  // suggestion was removed — this is momentum to lean into.
  if (count >= OPPORTUNITY_THRESHOLDS.interviewMomentumMinCount) {
    opportunities.push({
      kind: 'interview_momentum',
      text: `You have ${count} active interview-stage applications — strong momentum.`,
      action: 'Batch-schedule extra interview practice sessions this week to capitalize on it.',
    })
  }

  return opportunities
}
