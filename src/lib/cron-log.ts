import type { SupabaseClient } from '@supabase/supabase-js'
import type { createServiceClient } from '@/lib/supabase/service'

// Called right after a cron route's auth check passes, before any other
// logic — proves the route actually executed past CRON_SECRET, so a health
// check can tell "silently rejected" apart from "ran and had nothing to do".
export async function logCronRun(db: ReturnType<typeof createServiceClient>, job: string): Promise<void> {
  try {
    await db.from('cron_runs').insert({ job, ok: true })
  } catch {
    // Non-fatal: a logging failure shouldn't break the cron job itself
  }
}

// Max staleness is per-job, not a flat 24h: every job below is invoked by
// Vercel daily EXCEPT weekly-digest, which Vercel only invokes on Sundays
// (`30 2 * * 0` in vercel.json) — unlike monthly-digest, which Vercel
// invokes daily and which self-gates internally, so it still logs a row
// every day even on days it doesn't send. A flat 24h window would flag
// weekly-digest as "missing" on 6 out of 7 days by design, not by failure.
// Shared by /api/cron/cron-health-check (Telegram alert) and Settings'
// System Health card (passive display) — one source of truth for both.
export const EXPECTED_CRON_JOBS: { job: string; maxAgeHours: number }[] = [
  { job: 'daily-briefing',       maxAgeHours: 26 },
  { job: 'daily-coding',         maxAgeHours: 26 },
  { job: 'health-tip',           maxAgeHours: 26 },
  { job: 'job-alerts',           maxAgeHours: 26 },
  { job: 'recurring-expenses',   maxAgeHours: 26 },
  { job: 'sip-contribution',     maxAgeHours: 26 },
  { job: 'trending-reading',     maxAgeHours: 26 },
  { job: 'evening-checkin',      maxAgeHours: 26 },
  { job: 'monthly-digest',       maxAgeHours: 26 },
  { job: 'weekly-digest',        maxAgeHours: 8 * 24 },
]

export interface CronJobHealth {
  job: string
  lastRun: string | null
  status: 'healthy' | 'stale' | 'never-seen'
}

// Last-ever run per job, with no time bound — a job with zero history at all
// (e.g. weekly-digest before its first Sunday since this table was created)
// has no baseline to have gone stale *from*, so it's "never-seen" rather than
// "stale". Only a job that ran before and has since gone quiet for longer
// than its own cadence allows is a real "stale" signal.
export async function getCronJobHealth(db: SupabaseClient): Promise<CronJobHealth[]> {
  const { data: runs } = await db.from('cron_runs').select('job, created_at').order('created_at', { ascending: false })
  const lastRunByJob = new Map<string, string>()
  for (const r of runs ?? []) {
    if (!lastRunByJob.has(r.job)) lastRunByJob.set(r.job, r.created_at)
  }

  const now = Date.now()
  return EXPECTED_CRON_JOBS.map(({ job, maxAgeHours }) => {
    const lastRun = lastRunByJob.get(job) ?? null
    if (!lastRun) return { job, lastRun: null, status: 'never-seen' as const }
    const stale = now - new Date(lastRun).getTime() > maxAgeHours * 60 * 60 * 1000
    return { job, lastRun, status: stale ? 'stale' as const : 'healthy' as const }
  })
}
