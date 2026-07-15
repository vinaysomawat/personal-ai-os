import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrendingReading } from './types'
import { SYSTEM_DESIGN_ARTICLES } from './system-design-articles'
import { todayIST } from '@/lib/date'

const todayStr = todayIST

export async function getTodayTrendingReading(supabase: SupabaseClient, userId: string): Promise<TrendingReading | null> {
  const { data } = await supabase
    .from('trending_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('assigned_date', todayStr())
    .maybeSingle()
  return (data as TrendingReading | null) ?? null
}

// Deterministic rotation over the curated pool (system-design-articles.ts) —
// no AI, no live fetch. Excludes articles already assigned before, restarting
// the cycle once the whole pool is exhausted — same "no-repeat-until-
// exhausted" shape as the Workout Planner's rotation and getDailyTip().
// Previously fetched Hacker News's front page and keyword-matched titles,
// but system design is niche enough that HN's front page often had nothing
// relevant on a given day.
export async function generateTrendingReadingForUser(supabase: SupabaseClient, userId: string): Promise<TrendingReading | null> {
  const existing = await getTodayTrendingReading(supabase, userId)
  if (existing) return existing

  const { data: seenRows } = await supabase.from('trending_readings').select('url').eq('user_id', userId)
  const seenUrls = new Set((seenRows ?? []).map((r: { url: string }) => r.url))

  const unseen = SYSTEM_DESIGN_ARTICLES.filter(a => !seenUrls.has(a.url))
  const pool = unseen.length > 0 ? unseen : SYSTEM_DESIGN_ARTICLES
  const pick = pool[Math.floor(Math.random() * pool.length)]
  if (!pick) return null

  const { data: task } = await supabase
    .from('tasks')
    .insert({ text: `Read: ${pick.title}`, priority: 'low', area: 'Coding', user_id: userId, done: false })
    .select('id')
    .single()

  const { data: row } = await supabase
    .from('trending_readings')
    .insert({
      user_id: userId, assigned_date: todayStr(), title: pick.title, url: pick.url,
      source: pick.source, points: null, task_id: task?.id ?? null,
    })
    .select('*')
    .single()

  return (row as TrendingReading | null) ?? null
}

export async function markTrendingReadingComplete(supabase: SupabaseClient, id: string): Promise<void> {
  const { data: row } = await supabase.from('trending_readings').select('task_id').eq('id', id).single()
  await supabase.from('trending_readings').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', id)
  if (row?.task_id) {
    await supabase.from('tasks').update({ done: true }).eq('id', row.task_id)
  }
}
