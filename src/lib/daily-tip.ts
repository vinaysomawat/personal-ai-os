import type { SupabaseClient } from '@supabase/supabase-js'

const TIP_TABLE = { coding: 'coding_tips', health: 'health_tips' } as const
export type TipCategory = keyof typeof TIP_TABLE

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Deterministic rotation over a static curated pool — no AI, avoiding the
// hallucination risk of generating fresh "facts" daily. Same shape as
// Coding's question-pool cycling and the Workout Planner: exclude tips this
// user has already seen, and once the whole pool is exhausted, restart the
// cycle rather than repeating the same handful. Idempotent per day — calling
// this twice on the same day returns the same tip instead of picking again.
export async function getDailyTip(supabase: SupabaseClient, userId: string, category: TipCategory): Promise<string | null> {
  const today = todayStr()
  const table = TIP_TABLE[category]

  const { data: existing } = await supabase
    .from('daily_tips_log')
    .select('tip_id')
    .eq('user_id', userId).eq('category', category).eq('assigned_date', today)
    .maybeSingle()

  if (existing) {
    const { data: tip } = await supabase.from(table).select('tip').eq('id', existing.tip_id).maybeSingle()
    return tip?.tip ?? null
  }

  const [{ data: allTips }, { data: seenRows }] = await Promise.all([
    supabase.from(table).select('id, tip'),
    supabase.from('daily_tips_log').select('tip_id').eq('user_id', userId).eq('category', category),
  ])
  if (!allTips || allTips.length === 0) return null

  const seenIds = new Set((seenRows ?? []).map((r: { tip_id: string }) => r.tip_id))
  const unseen = allTips.filter((t: { id: string }) => !seenIds.has(t.id))
  const pool = unseen.length > 0 ? unseen : allTips
  const pick = pool[Math.floor(Math.random() * pool.length)]

  await supabase.from('daily_tips_log').insert({ user_id: userId, category, tip_id: pick.id, assigned_date: today })
  return pick.tip
}
