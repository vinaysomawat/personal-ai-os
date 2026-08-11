'use server'

import { createClient } from '@/lib/supabase/server'
import { computeCodingStats } from '@/features/coding/daily-core'
import type { Goal, GoalModule, AutoMetric, ResolvedGoal } from './types'

// Resolves live progress for auto-computed goals (Product Principle 2: no
// AI, pure reuse of each module's existing data) rather than trusting the
// stored current_value column, which would go stale between visits.
export async function resolveAutoMetric(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, metric: AutoMetric): Promise<number> {
  if (metric === 'coding_streak') {
    const stats = await computeCodingStats(supabase, userId)
    return stats.currentStreak
  }
  const { count } = await supabase
    .from('resources').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('type', 'book').eq('status', 'completed')
  return count ?? 0
}

export async function getGoals(module: GoalModule): Promise<ResolvedGoal[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('module', module).order('created_at', { ascending: true })
  const goals = (data ?? []) as Goal[]

  return Promise.all(goals.map(async g => ({
    ...g,
    resolvedCurrentValue: g.auto_metric ? await resolveAutoMetric(supabase, user.id, g.auto_metric) : g.current_value,
  })))
}
