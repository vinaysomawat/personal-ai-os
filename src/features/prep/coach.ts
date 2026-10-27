import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPrepData } from './core'
import { clock, hm, prepHourNow, nowBlock, readinessTier } from './war'
import { liveTimeline, overHint, span, type TimelineRow } from './timeline'

// Prep messages for the Daily bot — deterministic, on demand only ("what now";
// the scheduled coach messages are off). Also the "Still open" line the
// 9:30pm reminders cron sends.

type PrepData = NonNullable<Awaited<ReturnType<typeof loadPrepData>>>


export async function coachData(db: SupabaseClient, userId: string): Promise<PrepData | null> {
  const data = await loadPrepData(db, userId)
  return data
}


// Today's plan on the clock — the Daily bot's "what now" reply (with nowLine).
export function morningMessage(d: PrepData): string {
  const blocks = d.session?.blocks ?? []
  const now = nowBlock(blocks)
  const iv = d.session?.interview
  return [
    `🎯 *TODAY — ${d.window.label}*${iv ? ` · interview ${clock(iv.start)}` : ''}`,
    `Readiness *${d.war.overall}%* — ${readinessTier(d.war).label}`,
    '',
    ...d.planned.filter(r => r.kind !== 'flex').map(r => `${r.kind === 'block' && r.done ? '✅' : clock(r.start)} ${r.label}${r.kind === 'block' ? ` — ${hm(r.end - r.start)}` : ''}`),
    d.dropped.length ? `\nDidn't fit: ${d.dropped.map(b => b.label).join(', ')}` : null,
    now ? `\n👉 Start with: *${now.label}*\nReply *START* to begin a focus session.` : null,
    `\n🎙️ Reply *DRILL* for a spoken rep.`,
  ].filter(l => l !== null).join('\n')
}

// "what now": the timeline row the clock is in, and the next one.
export function nowLine(d: PrepData): string | null {
  if (!d.planned.length) return null
  const nowMin = Math.round(prepHourNow() * 60)
  const t = liveTimeline(d.planned, nowMin)
  const row = (r: TimelineRow) => `*${r.label}* (${span(r)})`
  return [
    t.current ? `🕐 Now: ${row(t.current)}` : `🕐 ${nowMin < t.start ? `Your day starts at ${clock(t.start)}.` : 'The timeline is done for today.'}`,
    t.next ? `Next: ${row(t.next)}` : null,
    t.over ? `The day ${overHint(t.over)}.` : null,
  ].filter(Boolean).join('\n')
}

// ---------------- Still open ----------------

// One compact line for the 9:30pm reminders: no expense logged today, a daily
// workout still open, and health metrics stale for 3+ days. null when
// nothing is open.
export async function stillOpenLine(db: SupabaseClient, userId: string, today: string): Promise<string | null> {
  const { getActiveWorkout } = await import('@/features/health/workout-core')
  const { computeStaleMetrics } = await import('@/features/health/stale-metrics')
  const [{ data: expenses }, workout, stale] = await Promise.all([
    db.from('expenses').select('id').eq('user_id', userId).eq('date', today).limit(1),
    getActiveWorkout(db, userId),
    computeStaleMetrics(db, userId, today),
  ])
  const items = [
    (expenses ?? []).length === 0 ? 'no expenses logged today' : null,
    workout ? `workout open (${workout.workout.name})` : null,
    stale.length ? `not logged: ${stale.join(', ')}` : null,
  ].filter(Boolean)
  return items.length ? `📌 *Still open:* ${items.join(' · ')}` : null
}
