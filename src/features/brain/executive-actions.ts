'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import { computeRiskEngine, computeOpportunityEngine, computeAutomationRules, type Risk, type Opportunity } from './risk-opportunity-engine'
import { computeCodingStats } from '@/features/coding/daily-core'
import { getWhatsChanged, type ChangeItem } from '@/features/dashboard/whats-changed'
import { generateEveningReflection, type EveningReflectionResult } from '@/features/ai/evening-reflection'

export interface ExecutiveData {
  brief: string | null
  risks: Risk[]
  opportunities: Opportunity[]
  automationRules: string[]
  whatsChanged: ChangeItem[]
  codingStreak: number
}

// Executive Dashboard / Daily Operating System (Phase 4 + 5 PRDs) —
// self-contained (like getWeeklyReflection/getMonthlyReview) rather than
// folded into getDashboardData(), since it needs its own auth resolution and
// these checks are a distinct concern from the core dashboard aggregate query.
export async function getExecutiveData(): Promise<ExecutiveData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { brief: null, risks: [], opportunities: [], automationRules: [], whatsChanged: [], codingStreak: 0 }

  const today = todayIST()
  const [{ data: briefRow }, risks, opportunities, automationRules, { data: dismissals }, whatsChanged, codingStats] = await Promise.all([
    supabase.from('daily_briefings').select('message').eq('user_id', user.id).eq('date', today).maybeSingle(),
    computeRiskEngine(supabase, user.id),
    computeOpportunityEngine(supabase, user.id),
    computeAutomationRules(supabase, user.id),
    supabase.from('decision_queue_dismissals').select('kind').eq('user_id', user.id).eq('date', today),
    getWhatsChanged(supabase, user.id),
    computeCodingStats(supabase, user.id),
  ])

  const dismissedKinds = new Set((dismissals ?? []).map(d => d.kind as string))

  return {
    brief: briefRow?.message ?? null,
    risks: risks.filter(r => !dismissedKinds.has(r.kind)),
    opportunities: opportunities.filter(o => !dismissedKinds.has(o.kind)),
    automationRules,
    whatsChanged,
    codingStreak: codingStats.currentStreak,
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

// Evening Reflection (Phase 5 PRD) — deliberately NOT part of getExecutiveData()'s
// eager fetch: it's only relevant after 6pm IST, and per the PRD's own
// performance requirement ("no blocking AI requests during initial load"),
// the client only calls this once it's decided the time gate has passed.
export async function getEveningReflection(): Promise<EveningReflectionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { reflection: '', tomorrowsPriority: null }

  return generateEveningReflection(supabase, user.id)
}
