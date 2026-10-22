import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST } from '@/lib/date'
import { loadPrepData } from '@/features/prep/core'
import { dayPace, isGoodDay, istHourNow, practicedToday, readinessTier } from '@/features/prep/war'
import { levelOf } from '@/features/prep/hunt'
import { runwayMonths } from '@/features/finance/calculations'

// Dashboard Hunt Hero (v4.0 §3): replaces Life Score + Quick Stats (Interview
// War Mode is always on). All deterministic — reuses Prep's own readiness/plan data.
export interface HuntHero {
  overall: number
  tier: { label: string; tone: 'good' | 'warn' | 'risk' }
  topBlocker: { label: string; score: number | null; gate: number } | null
  // Today's daily score (= % of today's plan done, partial credit per
  // question), the level, and the 13 days before (whole blocks only).
  // `rest` = today is the weekly rest day (no plan); recent rest days carry
  // `rest` too and draw as neutral bars.
  // `good` = 3 blocks done (green whatever the %).
  score: { today: number; level: string; rest: boolean; good: boolean; recent: { date: string; score: number | null; rest?: boolean; good?: boolean }[] }
  // Average of the last 5 reviewed mock rounds (/10), null before any.
  mockAvg: number | null
  // Revision queue topics due today or overdue.
  revisionDue: number
  blocks: { done: number; total: number }
  runway: number | null
}

export async function loadHuntHero(db: SupabaseClient, userId: string): Promise<HuntHero | null> {
  const [prep, profileRes, expensesRes] = await Promise.all([
    loadPrepData(db, userId),
    db.from('finance_profile').select('liquid_savings').eq('user_id', userId).maybeSingle(),
    db.from('expenses').select('amount').eq('user_id', userId).gte('date', daysAgoIST(90)),
  ])
  const blocks = prep.session?.blocks ?? []
  const pace = dayPace(blocks, istHourNow(), practicedToday(prep.bank, prep.today))
  const avgSpend = Math.round((expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0) / 3)
  return {
    overall: prep.war.overall,
    tier: readinessTier(prep.war),
    topBlocker: prep.war.blockers[0] ?? null,
    mockAvg: prep.war.mockAvg,
    revisionDue: prep.revision.filter(r => r.status === 'overdue' || r.status === 'today').length,
    score: { today: pace.donePct, level: levelOf(prep.settings.hours_per_day).label, rest: prep.restDay, good: isGoodDay(blocks), recent: prep.recentScores },
    blocks: { done: blocks.filter(b => b.done).length, total: blocks.length },
    // liquid_savings may not exist before the Phase 1 migration — null then.
    runway: runwayMonths((profileRes.data as { liquid_savings?: number | null } | null)?.liquid_savings, avgSpend),
  }
}
