import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST } from '@/lib/date'
import { loadPrepData } from '@/features/prep/core'
import { focusSeconds, readinessTier } from '@/features/prep/war'
import { loadPipelineStatus, type PipelineStatus } from '@/features/career/pipeline-status'
import { runwayMonths } from '@/features/finance/calculations'

// Dashboard Hunt Hero (v4.0 §3): replaces Life Score + Quick Stats while Job
// Hunt Mode is on. All deterministic — reuses Prep's own readiness/plan data.
export interface HuntHero {
  overall: number
  tier: { label: string; tone: 'good' | 'warn' | 'risk' }
  topBlocker: { label: string; score: number | null; gate: number } | null
  daysLeft: number | null
  nextInterview: { company: string; kind: string; scheduled_at: string } | null
  pipeline: PipelineStatus
  focusedMinutes: number
  blocks: { done: number; total: number }
  runway: number | null
}

export async function loadHuntHero(db: SupabaseClient, userId: string): Promise<HuntHero | null> {
  const { data: settings } = await db.from('prep_settings').select('target_date, weekly_outreach_target').eq('user_id', userId).maybeSingle()
  if (!settings?.target_date) return null
  const [prep, pipeline, profileRes, expensesRes] = await Promise.all([
    loadPrepData(db, userId),
    loadPipelineStatus(db, userId, settings.weekly_outreach_target ?? 15),
    db.from('finance_profile').select('liquid_savings').eq('user_id', userId).maybeSingle(),
    db.from('expenses').select('amount').eq('user_id', userId).gte('date', daysAgoIST(90)),
  ])
  const blocks = prep.session?.blocks ?? []
  const avgSpend = Math.round((expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0) / 3)
  return {
    overall: prep.war.overall,
    tier: readinessTier(prep.war),
    topBlocker: prep.war.blockers[0] ?? null,
    daysLeft: prep.daysLeft,
    nextInterview: prep.nextInterview,
    pipeline,
    focusedMinutes: Math.round(prep.focusSessions.filter(f => f.date === prep.today).reduce((s, f) => s + focusSeconds(f), 0) / 60),
    blocks: { done: blocks.filter(b => b.done).length, total: blocks.length },
    // liquid_savings may not exist before the Phase 1 migration — null then.
    runway: runwayMonths((profileRes.data as { liquid_savings?: number | null } | null)?.liquid_savings, avgSpend),
  }
}
