import type { SupabaseClient } from '@supabase/supabase-js'

export interface FoodLogEntry {
  id: string
  date: string
  item: string
  quantity: number | null
  unit: string | null
  calories: number
  protein_g: number
  created_at: string
}

// Deletes one food_log row and subtracts it back out of that day's
// health_metrics calories/protein_g total (food_log rolls up additively
// into those columns when logged). Shared by the Telegram undo button and
// the Health page's Today's Food list so both stay in sync.
export async function removeFoodLogEntry(db: SupabaseClient, id: string): Promise<Record<string, unknown> | null> {
  const { data: row } = await db.from('food_log').select('*').eq('id', id).maybeSingle()
  if (!row) return null
  const { error } = await db.from('food_log').delete().eq('id', id)
  if (error) throw new Error(error.message)
  const { data: metrics } = await db.from('health_metrics').select('calories, protein_g').eq('user_id', row.user_id).eq('date', row.date).maybeSingle()
  if (metrics) {
    // health_metrics.calories/protein_g are integer columns — round the
    // result even though food_log values are already whole numbers, so
    // this stays safe if that ever changes.
    await db.from('health_metrics').update({
      calories: Math.max(0, Math.round((metrics.calories ?? 0) - Number(row.calories ?? 0))),
      protein_g: Math.max(0, Math.round((metrics.protein_g ?? 0) - Number(row.protein_g ?? 0))),
    }).eq('user_id', row.user_id).eq('date', row.date)
  }
  return row
}
