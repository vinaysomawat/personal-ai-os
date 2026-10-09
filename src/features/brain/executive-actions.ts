'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import { computeRiskEngine, computeOpportunityEngine, type Risk, type Opportunity } from './risk-opportunity-engine'

export interface ExecutiveData {
  risks: Risk[]
  opportunities: Opportunity[]
}

// Risks + opportunities for Needs Attention and the Top Priority banner,
// minus anything dismissed today. (The Morning Brief, Automation Rules,
// What's Changed and Evening Reflection were removed 2026-10-10.)
export async function getExecutiveData(): Promise<ExecutiveData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { risks: [], opportunities: [] }

  const today = todayIST()
  const [risks, opportunities, { data: dismissals }] = await Promise.all([
    computeRiskEngine(supabase, user.id),
    computeOpportunityEngine(supabase, user.id),
    supabase.from('decision_queue_dismissals').select('kind').eq('user_id', user.id).eq('date', today),
  ])
  const dismissedKinds = new Set((dismissals ?? []).map(d => d.kind as string))
  return {
    risks: risks.filter(r => !dismissedKinds.has(r.kind)),
    opportunities: opportunities.filter(o => !dismissedKinds.has(o.kind)),
  }
}

// Dismissing a Needs Attention item only suppresses that `kind` for today —
// the checks are recomputed fresh tomorrow.
export async function dismissDecisionQueueItem(kind: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('decision_queue_dismissals').upsert({ user_id: user.id, date: todayIST(), kind }, { onConflict: 'user_id,date,kind' })
  revalidatePath('/dashboard')
}
