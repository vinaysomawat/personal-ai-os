import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST } from '@/lib/date'

type StaleMetricKey = 'weight_kg' | 'steps' | 'calories'

const STALE_METRICS: { key: StaleMetricKey; label: string; thresholdDays: number }[] = [
  { key: 'weight_kg', label: 'weight', thresholdDays: 3 },
  { key: 'steps', label: 'steps', thresholdDays: 3 },
  { key: 'calories', label: 'calories', thresholdDays: 3 },
]

// A metric only surfaces once it has actually gone stale (≥3 days since it
// was last logged), phrased with the real gap — not a flat "not logged
// today" nag every evening. Used by the 9:30pm Prep Coach "Still open:" line.
export async function computeStaleMetrics(supabase: SupabaseClient, userId: string, today: string): Promise<string[]> {
  const since = daysAgoIST(90)
  const { data } = await supabase.from('health_metrics').select('date, weight_kg, steps, calories')
    .eq('user_id', userId).gte('date', since).order('date', { ascending: false })
  const rows = (data ?? []) as Record<StaleMetricKey | 'date', unknown>[]
  const daysBetween = (a: string, b: string) => Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86400000)
  const out: string[] = []
  for (const m of STALE_METRICS) {
    const last = rows.find(r => r[m.key] !== null && r[m.key] !== undefined)
    const gap = last ? daysBetween(today, last.date as string) : daysBetween(today, since)
    if (gap >= m.thresholdDays) out.push(`${m.label} (${gap}d)`)
  }
  return out
}
