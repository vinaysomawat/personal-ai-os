import type { SupabaseClient } from '@supabase/supabase-js'

// Public, unauthenticated job-board APIs — same "free public API" pattern as
// Trending Reading's Hacker News integration. Only companies confirmed to
// expose a live public Greenhouse/Lever board (verified manually) are
// listed; most FAANG-tier companies use a proprietary careers site with no
// public API, so they're structurally out of reach for this approach.
const COMPANIES: { name: string; ats: 'greenhouse' | 'lever'; slug: string }[] = [
  { name: 'Anthropic',  ats: 'greenhouse', slug: 'anthropic' },
  { name: 'Stripe',     ats: 'greenhouse', slug: 'stripe' },
  { name: 'Airbnb',     ats: 'greenhouse', slug: 'airbnb' },
  { name: 'Figma',      ats: 'greenhouse', slug: 'figma' },
  { name: 'Discord',    ats: 'greenhouse', slug: 'discord' },
  { name: 'GitLab',     ats: 'greenhouse', slug: 'gitlab' },
  { name: 'Coinbase',   ats: 'greenhouse', slug: 'coinbase' },
  { name: 'Databricks', ats: 'greenhouse', slug: 'databricks' },
  { name: 'Robinhood',  ats: 'greenhouse', slug: 'robinhood' },
  { name: 'Brex',       ats: 'greenhouse', slug: 'brex' },
  { name: 'Scale AI',   ats: 'greenhouse', slug: 'scaleai' },
  { name: 'Postman',    ats: 'greenhouse', slug: 'postman' },
  { name: 'Cloudflare', ats: 'greenhouse', slug: 'cloudflare' },
  { name: 'Groww',      ats: 'greenhouse', slug: 'groww' },
  { name: 'CRED',       ats: 'lever',      slug: 'cred' },
  { name: 'Meesho',     ats: 'lever',      slug: 'meesho' },
]

const ROLE_KEYWORDS = ['frontend', 'front-end', 'front end', 'ui engineer']

function matchesRole(title: string): boolean {
  const lower = title.toLowerCase()
  return ROLE_KEYWORDS.some(k => lower.includes(k))
}

interface JobPosting {
  company: string
  source: 'greenhouse' | 'lever'
  externalId: string
  title: string
  url: string
}

async function fetchGreenhouseJobs(company: string, slug: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = (data.jobs ?? []) as { id: number; title: string; absolute_url: string }[]
    return jobs.map(j => ({ company, source: 'greenhouse' as const, externalId: String(j.id), title: j.title, url: j.absolute_url }))
  } catch {
    return []
  }
}

async function fetchLeverJobs(company: string, slug: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = Array.isArray(data) ? data as { id: string; text: string; hostedUrl: string }[] : []
    return jobs.map(j => ({ company, source: 'lever' as const, externalId: j.id, title: j.text, url: j.hostedUrl }))
  } catch {
    return []
  }
}

// Deterministic — no AI. Fetches every configured company's public board in
// parallel, filters by role keyword, dedupes against job_alerts_seen (which
// this also writes to), and returns only postings genuinely new since the
// last check — same dedupe-log shape as trending_readings.
export async function findNewJobAlerts(supabase: SupabaseClient, userId: string): Promise<JobPosting[]> {
  const results = await Promise.all(
    COMPANIES.map(c => c.ats === 'greenhouse' ? fetchGreenhouseJobs(c.name, c.slug) : fetchLeverJobs(c.name, c.slug))
  )
  const matches = results.flat().filter(j => matchesRole(j.title))
  if (matches.length === 0) return []

  const { data: seenRows } = await supabase
    .from('job_alerts_seen')
    .select('source, external_id')
    .eq('user_id', userId)
  const seen = new Set((seenRows ?? []).map((r: { source: string; external_id: string }) => `${r.source}:${r.external_id}`))

  const newMatches = matches.filter(j => !seen.has(`${j.source}:${j.externalId}`))
  if (newMatches.length === 0) return []

  await supabase.from('job_alerts_seen').insert(
    newMatches.map(j => ({ user_id: userId, source: j.source, company: j.company, external_id: j.externalId, title: j.title, url: j.url }))
  )

  return newMatches
}
