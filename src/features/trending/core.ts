import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrendingReading } from './types'

const KEYWORDS = [
  'react', 'next.js', 'nextjs', 'vue', 'svelte', 'angular', 'javascript', 'typescript',
  'css', 'html', 'frontend', 'front-end', 'front end', 'web dev', 'webdev', 'browser',
  'ui', 'ux', 'design system', 'tailwind', 'vite', 'webassembly', 'node.js', 'nodejs',
  'ai', 'llm', 'claude', 'anthropic', 'gpt', 'openai', 'chatgpt', 'copilot', 'cursor',
  'agent', 'agentic', 'machine learning', 'ml model', 'neural',
]

interface HNHit {
  title: string | null
  url: string | null
  points: number | null
  objectID: string
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Word-boundary match — plain substring matching lets short keywords like
// "ai" or "ui" false-positive inside unrelated words ("maintain", "domain").
const KEYWORD_PATTERN = new RegExp(`\\b(${KEYWORDS.map(escapeRegex).join('|')})\\b`, 'i')

function matchesKeyword(title: string): boolean {
  return KEYWORD_PATTERN.test(title)
}

// Hacker News's Algolia-backed API — public, no auth, one request for the
// whole front page instead of N+1 item lookups.
async function fetchHNFrontPage(): Promise<HNHit[]> {
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=100', { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.hits ?? []) as HNHit[]
  } catch {
    return []
  }
}

export async function getTodayTrendingReading(supabase: SupabaseClient, userId: string): Promise<TrendingReading | null> {
  const { data } = await supabase
    .from('trending_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('assigned_date', todayStr())
    .maybeSingle()
  return (data as TrendingReading | null) ?? null
}

// Deterministic selection over real fetched data — no AI involved. Picks the
// highest-points frontend/AI story not already assigned before.
export async function generateTrendingReadingForUser(supabase: SupabaseClient, userId: string): Promise<TrendingReading | null> {
  const existing = await getTodayTrendingReading(supabase, userId)
  if (existing) return existing

  const [{ data: seenRows }, hits] = await Promise.all([
    supabase.from('trending_readings').select('url').eq('user_id', userId),
    fetchHNFrontPage(),
  ])
  const seenUrls = new Set((seenRows ?? []).map((r: { url: string }) => r.url))

  const candidates = hits
    .filter((h): h is HNHit & { title: string; url: string } => !!h.title && !!h.url)
    .filter(h => matchesKeyword(h.title))
    .filter(h => !seenUrls.has(h.url))
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))

  const pick = candidates[0]
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
      source: 'hackernews', points: pick.points ?? null, task_id: task?.id ?? null,
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
