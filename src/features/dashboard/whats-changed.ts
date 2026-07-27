'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST } from '@/lib/date'

export interface ChangeItem {
  emoji: string
  label: string
  value: string
  tone: 'good' | 'risk' | 'neutral'
  href: string
}

// Daily Operating System's "What's Changed" (Phase 5 PRD) — pure deterministic
// day-over-day deltas, no AI. Self-contained (creates its own supabase client)
// since none of this is part of getDashboardData()'s existing aggregate.
export async function getWhatsChanged(supabase: SupabaseClient, userId: string): Promise<ChangeItem[]> {
  const today = todayIST()
  const yesterday = daysAgoIST(1)

  const [{ data: metrics }, { data: todayExpenses }, { data: todayWorkouts }, { data: todayApps }, { data: scores }] = await Promise.all([
    supabase.from('health_metrics').select('date, weight_kg').eq('user_id', userId).in('date', [today, yesterday]),
    supabase.from('expenses').select('amount').eq('user_id', userId).eq('date', today),
    supabase.from('workouts').select('id').eq('user_id', userId).eq('date', today),
    supabase.from('applications').select('id').eq('user_id', userId).eq('applied_at', today),
    supabase.from('life_score_logs').select('life_score').eq('user_id', userId).order('date', { ascending: false }).limit(2),
  ])

  const items: ChangeItem[] = []

  const weightRows = (metrics ?? []) as { date: string; weight_kg: number | null }[]
  const todayWeight = weightRows.find(r => r.date === today)?.weight_kg
  const yesterdayWeight = weightRows.find(r => r.date === yesterday)?.weight_kg
  if (todayWeight != null && yesterdayWeight != null) {
    const delta = todayWeight - yesterdayWeight
    if (delta !== 0) {
      // Goal is a gradual deficit (§5), so a drop is progress and a gain is a setback.
      items.push({ emoji: delta < 0 ? '↓' : '↑', label: 'Weight', value: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}kg`, tone: delta < 0 ? 'good' : 'risk', href: '/health' })
    }
  }

  const todayExpenseTotal = (todayExpenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0)
  if (todayExpenseTotal > 0) {
    items.push({ emoji: '💸', label: 'Expense logged', value: `₹${Math.round(todayExpenseTotal).toLocaleString('en-IN')}`, tone: 'neutral', href: '/finance' })
  }

  if ((todayWorkouts ?? []).length > 0) {
    items.push({ emoji: '🏋️', label: 'Workout', value: 'Completed', tone: 'good', href: '/health' })
  }

  if ((todayApps ?? []).length > 0) {
    const count = (todayApps ?? []).length
    items.push({ emoji: '💼', label: 'Applications', value: `${count} added`, tone: 'neutral', href: '/career' })
  }

  const scoreRows = scores ?? []
  if (scoreRows.length === 2) {
    const delta = scoreRows[0].life_score - scoreRows[1].life_score
    if (delta !== 0) {
      items.push({ emoji: delta > 0 ? '↑' : '↓', label: 'Life Score', value: `${delta > 0 ? '+' : ''}${delta}`, tone: delta > 0 ? 'good' : 'risk', href: '/dashboard' })
    }
  }

  return items
}
