import type { SupabaseClient } from '@supabase/supabase-js'
import type { JobAlert } from './types'

// Public, unauthenticated job-board APIs — same "free public API" pattern as
// Trending Reading's Hacker News integration. Only companies confirmed to
// expose a live public Greenhouse/Lever/Ashby board (verified manually) are
// listed. LinkedIn/Naukri are deliberately excluded: neither exposes a
// public API without an enterprise/paid contract, and scraping either means
// bypassing bot detection, which this app won't do. Most FAANG-tier
// companies also use a proprietary careers site with no public API, so
// they're structurally out of reach for this approach — Ashby closes some
// of that gap (OpenAI, Notion, Ramp, Linear, Vercel, and several other
// high-paying AI/dev-tool companies run on it).
const COMPANIES: { name: string; ats: 'greenhouse' | 'lever' | 'ashby'; slug: string }[] = [
  // Greenhouse
  { name: 'Anthropic',   ats: 'greenhouse', slug: 'anthropic' },
  { name: 'Stripe',      ats: 'greenhouse', slug: 'stripe' },
  { name: 'Airbnb',      ats: 'greenhouse', slug: 'airbnb' },
  { name: 'Figma',       ats: 'greenhouse', slug: 'figma' },
  { name: 'Discord',     ats: 'greenhouse', slug: 'discord' },
  { name: 'GitLab',      ats: 'greenhouse', slug: 'gitlab' },
  { name: 'Coinbase',    ats: 'greenhouse', slug: 'coinbase' },
  { name: 'Databricks',  ats: 'greenhouse', slug: 'databricks' },
  { name: 'Robinhood',   ats: 'greenhouse', slug: 'robinhood' },
  { name: 'Brex',        ats: 'greenhouse', slug: 'brex' },
  { name: 'Scale AI',    ats: 'greenhouse', slug: 'scaleai' },
  { name: 'Postman',     ats: 'greenhouse', slug: 'postman' },
  { name: 'Cloudflare',  ats: 'greenhouse', slug: 'cloudflare' },
  { name: 'Groww',       ats: 'greenhouse', slug: 'groww' },
  { name: 'Instacart',   ats: 'greenhouse', slug: 'instacart' },
  { name: 'Pinterest',   ats: 'greenhouse', slug: 'pinterest' },
  { name: 'Reddit',      ats: 'greenhouse', slug: 'reddit' },
  { name: 'Datadog',     ats: 'greenhouse', slug: 'datadog' },
  { name: 'Samsara',     ats: 'greenhouse', slug: 'samsara' },
  { name: 'Asana',       ats: 'greenhouse', slug: 'asana' },
  { name: 'Dropbox',     ats: 'greenhouse', slug: 'dropbox' },
  { name: 'Squarespace', ats: 'greenhouse', slug: 'squarespace' },
  { name: 'Webflow',     ats: 'greenhouse', slug: 'webflow' },
  { name: 'MongoDB',     ats: 'greenhouse', slug: 'mongodb' },
  { name: 'Elastic',     ats: 'greenhouse', slug: 'elastic' },
  { name: 'Twilio',      ats: 'greenhouse', slug: 'twilio' },
  { name: 'Affirm',      ats: 'greenhouse', slug: 'affirm' },
  { name: 'Chime',       ats: 'greenhouse', slug: 'chime' },
  { name: 'Gusto',       ats: 'greenhouse', slug: 'gusto' },
  // Lever
  { name: 'CRED',        ats: 'lever',      slug: 'cred' },
  { name: 'Meesho',      ats: 'lever',      slug: 'meesho' },
  // Ashby
  { name: 'OpenAI',      ats: 'ashby', slug: 'openai' },
  { name: 'Notion',      ats: 'ashby', slug: 'notion' },
  { name: 'Ramp',        ats: 'ashby', slug: 'ramp' },
  { name: 'Linear',      ats: 'ashby', slug: 'linear' },
  { name: 'Vercel',      ats: 'ashby', slug: 'vercel' },
  { name: 'Plaid',       ats: 'ashby', slug: 'plaid' },
  { name: 'Miro',        ats: 'ashby', slug: 'miro' },
  { name: 'Confluent',   ats: 'ashby', slug: 'confluent' },
  { name: 'Benchling',   ats: 'ashby', slug: 'benchling' },
  { name: 'Zapier',      ats: 'ashby', slug: 'zapier' },
  { name: 'Deel',        ats: 'ashby', slug: 'deel' },
  { name: 'Mercury',     ats: 'ashby', slug: 'mercury' },
  { name: 'Replit',      ats: 'ashby', slug: 'replit' },
  { name: 'Browserbase', ats: 'ashby', slug: 'browserbase' },
  { name: 'Perplexity',  ats: 'ashby', slug: 'perplexity' },
  { name: 'LangChain',   ats: 'ashby', slug: 'langchain' },
  { name: 'Pinecone',    ats: 'ashby', slug: 'pinecone' },
  { name: 'Cursor',      ats: 'ashby', slug: 'cursor' },
]

const ROLE_KEYWORDS = ['frontend', 'front-end', 'front end', 'ui engineer']

function matchesRole(title: string): boolean {
  const lower = title.toLowerCase()
  return ROLE_KEYWORDS.some(k => lower.includes(k))
}

const SENIOR_KEYWORDS = ['senior', 'sr.', 'staff', 'lead', 'principal']

function isSeniorRole(title: string): boolean {
  const lower = title.toLowerCase()
  return SENIOR_KEYWORDS.some(k => lower.includes(k))
}

interface JobPosting {
  company: string
  source: 'greenhouse' | 'lever' | 'ashby'
  externalId: string
  title: string
  url: string
  description: string
}

async function fetchGreenhouseJobs(company: string, slug: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = (data.jobs ?? []) as { id: number; title: string; absolute_url: string; content?: string }[]
    return jobs.map(j => ({
      company, source: 'greenhouse' as const, externalId: String(j.id), title: j.title, url: j.absolute_url,
      description: (j.content ?? '').replace(/<[^>]+>/g, ' '),
    }))
  } catch {
    return []
  }
}

async function fetchLeverJobs(company: string, slug: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = Array.isArray(data) ? data as { id: string; text: string; hostedUrl: string; descriptionPlain?: string; additionalPlain?: string }[] : []
    return jobs.map(j => ({
      company, source: 'lever' as const, externalId: j.id, title: j.text, url: j.hostedUrl,
      description: `${j.descriptionPlain ?? ''} ${j.additionalPlain ?? ''}`,
    }))
  } catch {
    return []
  }
}

async function fetchAshbyJobs(company: string, slug: string): Promise<JobPosting[]> {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    const jobs = (data.jobs ?? []) as { id: string; title: string; jobUrl: string; descriptionPlain?: string }[]
    return jobs.map(j => ({
      company, source: 'ashby' as const, externalId: j.id, title: j.title, url: j.jobUrl,
      description: j.descriptionPlain ?? '',
    }))
  } catch {
    return []
  }
}

// Matches "$180,000 - $220,000", "$180k-$220k", "$180,000-220,000", etc.
// Values under 1000 are assumed to be in "k" shorthand even without a
// trailing 'k' (postings sometimes write "$180 - $220" meaning thousands).
function parseSalaryRange(text: string): { min: number; max: number } | null {
  const match = text.match(/\$\s?([\d,]{2,7})(?:\.\d+)?\s*(k|K)?\s*[-–—]\s*\$?\s?([\d,]{2,7})(?:\.\d+)?\s*(k|K)?/)
  if (!match) return null
  const toNumber = (raw: string, kSuffix: string | undefined) => {
    let n = parseInt(raw.replace(/,/g, ''), 10)
    if (kSuffix || n < 1000) n *= 1000
    return n
  }
  const min = toNumber(match[1], match[2])
  const max = toNumber(match[3], match[4])
  if (!min || !max || min > max || max > 2_000_000) return null
  return { min, max }
}

function matchSkills(text: string, skills: string[]): string[] {
  const lower = text.toLowerCase()
  return skills.filter(s => lower.includes(s.toLowerCase()))
}

// Deterministic 0-100 fit score (Product Principle 2 — no AI for score
// math): 40 for a senior+ title, up to 40 proportional to tracked-skill
// overlap (10/skill, capped), 20 if the parsed salary floor beats the
// user's current salary. Unparsed salary is scored neutrally (0), not
// penalized — most postings still don't state one.
function computeScore(title: string, matchedSkills: string[], salaryMin: number | null, currentSalary: number | null): number {
  let score = 0
  if (isSeniorRole(title)) score += 40
  score += Math.min(matchedSkills.length * 10, 40)
  if (salaryMin && currentSalary && salaryMin >= currentSalary) score += 20
  return score
}

// Deterministic — no AI. Fetches every configured company's public board in
// parallel, filters by role keyword, dedupes against job_alerts_seen (which
// this also writes to), and returns only postings genuinely new since the
// last check. Each new posting is scored against the user's tracked Skills
// and Career Profile salary (see computeScore above) so the caller can
// sort/filter by fit without recomputing anything.
export async function findNewJobAlerts(supabase: SupabaseClient, userId: string): Promise<JobAlert[]> {
  const [results, { data: skillRows }, { data: profile }] = await Promise.all([
    Promise.all(COMPANIES.map(c => {
      if (c.ats === 'greenhouse') return fetchGreenhouseJobs(c.name, c.slug)
      if (c.ats === 'lever') return fetchLeverJobs(c.name, c.slug)
      return fetchAshbyJobs(c.name, c.slug)
    })),
    supabase.from('skills').select('name').eq('user_id', userId),
    supabase.from('career_profile').select('current_salary').eq('user_id', userId).single(),
  ])
  const matches = results.flat().filter(j => matchesRole(j.title))
  if (matches.length === 0) return []

  const { data: seenRows } = await supabase
    .from('job_alerts_seen')
    .select('source, external_id')
    .eq('user_id', userId)
  const seen = new Set((seenRows ?? []).map((r: { source: string; external_id: string }) => `${r.source}:${r.external_id}`))

  const newMatches = matches.filter(j => !seen.has(`${j.source}:${j.externalId}`))
  if (newMatches.length === 0) return []

  const skillNames = ((skillRows ?? []) as { name: string }[]).map(s => s.name)
  const currentSalary = profile?.current_salary ?? null

  const scored = newMatches.map(j => {
    const matchedSkills = matchSkills(`${j.title} ${j.description}`, skillNames)
    const salary = parseSalaryRange(j.description)
    return {
      user_id: userId, source: j.source, company: j.company, external_id: j.externalId, title: j.title, url: j.url,
      salary_min: salary?.min ?? null, salary_max: salary?.max ?? null, matched_skills: matchedSkills,
      score: computeScore(j.title, matchedSkills, salary?.min ?? null, currentSalary),
    }
  })

  const { data: inserted } = await supabase.from('job_alerts_seen').insert(scored).select('*')
  return ((inserted ?? []) as JobAlert[]).sort((a, b) => b.score - a.score)
}
