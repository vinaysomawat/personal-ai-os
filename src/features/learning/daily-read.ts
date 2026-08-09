import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, toISTDateStr } from '@/lib/date'
import { READING_ARTICLES } from './reading-articles'
import { recommendDailyRead } from '@/features/ai/study-plan'
import type { Resource } from './types'

export const DAILY_READ_NOTE_PREFIX = '📖 Daily read.'
const MAX_PREFERRED_MINUTES = 60

// created_at is a raw UTC timestamptz — must be shifted to its IST calendar
// date before comparing against todayIST(), or this silently breaks near
// the UTC/IST day boundary (~5:30am IST).
export const isMarkedToday = (r: Pick<Resource, 'notes' | 'created_at'>) =>
  !!r.notes?.startsWith(DAILY_READ_NOTE_PREFIX) && toISTDateStr(r.created_at) === todayIST()

// Deterministic-first daily pick (Product Principle 2): the curated pool
// (reading-articles.ts) is used first — real, hand-verified URLs, no repeats
// (each article is only ever picked once, unlike the old trending/core.ts
// rotation this replaces, which restarted and repeated once exhausted). Only
// once every curated article is already in the resource list does this fall
// back to an AI suggestion (recommendDailyRead — no URL, see that function).
// Idempotent per day: bails out if a daily-read-marked resource created
// today already exists, so this is safe to call from both the page load and
// the daily cron without double-adding.
export async function ensureDailyRead(supabase: SupabaseClient, userId: string, resources: Resource[]): Promise<Resource | null> {
  const alreadyPicked = resources.some(isMarkedToday)
  if (alreadyPicked) return null

  const existingUrls = new Set(resources.map(r => r.url).filter(Boolean))
  const existingTitles = new Set(resources.map(r => r.title))
  const unseen = READING_ARTICLES.filter(a => !existingUrls.has(a.url))
  const preferred = unseen.filter(a => a.estimatedMinutes <= MAX_PREFERRED_MINUTES)
  const pick = (preferred.length > 0 ? preferred : unseen)[0]

  let title: string, url: string | null, category: string, notes: string, estimatedMinutes: number

  if (pick) {
    const longNote = pick.estimatedMinutes > MAX_PREFERRED_MINUTES ? ' Longer piece — fine to split across a couple of sessions.' : ''
    title = pick.title
    url = pick.url
    category = pick.category
    estimatedMinutes = pick.estimatedMinutes
    notes = `${DAILY_READ_NOTE_PREFIX} ${pick.source}.${longNote}`
  } else {
    const ai = await recommendDailyRead(resources)
    if (!ai || existingTitles.has(ai.title)) return null
    title = ai.title
    url = null
    category = ai.category
    estimatedMinutes = ai.estimatedMinutes
    notes = `${DAILY_READ_NOTE_PREFIX} ${ai.reason}`
  }

  const { data: task } = await supabase
    .from('tasks')
    .insert({ text: `Read: ${title}`, priority: 'low', area: 'Learning', user_id: userId, done: false })
    .select('id')
    .single()

  const { data: row } = await supabase
    .from('resources')
    .insert({
      user_id: userId, title, type: 'article', url, category, estimated_minutes: estimatedMinutes,
      status: 'not-started', progress: 0, notes, task_id: task?.id ?? null,
    })
    .select('*')
    .single()

  return (row as Resource | null) ?? null
}
