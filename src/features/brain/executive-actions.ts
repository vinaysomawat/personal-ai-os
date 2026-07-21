'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import { computeRiskEngine, computeOpportunityEngine, type Risk, type Opportunity } from './risk-opportunity-engine'

export interface ExecutiveData {
  brief: string | null
  risks: Risk[]
  opportunities: Opportunity[]
}

// Executive Dashboard (Phase 4 PRD) — self-contained (like getWeeklyReflection/
// getMonthlyReview) rather than folded into getDashboardData(), since it needs
// its own auth resolution and the Risk/Opportunity checks are a distinct
// concern from the core dashboard aggregate query.
export async function getExecutiveData(): Promise<ExecutiveData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { brief: null, risks: [], opportunities: [] }

  const today = todayIST()
  const [{ data: briefRow }, risks, opportunities, { data: dismissals }] = await Promise.all([
    supabase.from('daily_briefings').select('message').eq('user_id', user.id).eq('date', today).maybeSingle(),
    computeRiskEngine(supabase, user.id),
    computeOpportunityEngine(supabase, user.id),
    supabase.from('decision_queue_dismissals').select('kind').eq('user_id', user.id).eq('date', today),
  ])

  const dismissedKinds = new Set((dismissals ?? []).map(d => d.kind as string))

  return {
    brief: briefRow?.message ?? null,
    risks: risks.filter(r => !dismissedKinds.has(r.kind)),
    opportunities: opportunities.filter(o => !dismissedKinds.has(o.kind)),
  }
}

// Dismissing a Decision Queue item only suppresses that `kind` for today —
// the underlying checks are recomputed fresh tomorrow, so there's no
// permanent "dismissed forever" state to manage.
export async function dismissDecisionQueueItem(kind: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('decision_queue_dismissals').upsert(
    { user_id: user.id, date: todayIST(), kind },
    { onConflict: 'user_id,date,kind' }
  )
  revalidatePath('/dashboard')
}
