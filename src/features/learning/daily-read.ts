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

export const isDailyRead = (r: Pick<Resource, 'notes'>) => !!r.notes?.startsWith(DAILY_READ_NOTE_PREFIX)

// The current daily read — carry-over, not strictly "created today"
// (changed 2026-09-24): the most recent daily-read resource, while it's
// still unread or was picked today. An unread pick stays the active one
// (badge, top of list, Dashboard's Daily Mission item, protected from the
// stale-task cleanup) instead of a new article landing on top of it daily.
export function getActiveDailyRead<T extends Pick<Resource, 'notes' | 'created_at' | 'status'>>(resources: T[]): T | null {
  const latest = resources.filter(isDailyRead).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  if (!latest) return null
  return latest.status !== 'completed' || toISTDateStr(latest.created_at) === todayIST() ? latest : null
}

// Deterministic-first daily pick (Product Principle 2): the curated pool
// (reading-articles.ts) is used first — real, hand-verified URLs, no repeats
// (each article is only ever picked once, unlike the old trending/core.ts
// rotation this replaces, which restarted and repeated once exhausted). Only
// once every curated article is already in the resource list does this fall
// back to an AI suggestion (recommendDailyRead — title/category/reason only;
// its self-reported url is discarded below rather than trusted, since this
// pick gets no human review before reaching the user, unlike the curated
// pool's real, hand-verified links above).
// Idempotent per day: bails out if a daily-read-marked resource created
// today already exists, so this is safe to call from both the page load and
// the daily cron without double-adding.
export async function ensureDailyRead(supabase: SupabaseClient, userId: string, resources: Resource[]): Promise<Resource | null> {
  // Picked today already, or the previous pick is still unread (carry-over
  // — added after a usage audit: 1 of 20 September reads done while a new
  // one landed every day, leaving 19 unread).
  if (getActiveDailyRead(resources)) return null

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
    // Discard the model's self-reported url rather than trust it as a real
    // link — unlike the curated pool above, this pick gets no human review
    // before going out (auto-inserted here, then pushed verbatim by the
    // daily-read cron/Telegram reply), so an unverified guess would reach
    // the user presented as a confirmed link. null renders as "search for
    // it" instead (see modules/learning.ts's today's-read reply).
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
