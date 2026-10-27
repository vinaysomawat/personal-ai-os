import type { SupabaseClient } from '@supabase/supabase-js'
import { loadPrepData } from './core'
import { clock, dayWindow, hm, prepHourNow, nowBlock, readinessTier } from './war'
import { levelOf } from './hunt'
import { buildTimeline, overHint, planTimeline, span, type TimelineRow } from './timeline'

// Prep messages for the Daily bot — deterministic, on demand only ("what now";
// the scheduled coach messages are off). Also the "Still open" line the
// 9:30pm reminders cron sends.

type PrepData = NonNullable<Awaited<ReturnType<typeof loadPrepData>>>


export async function coachData(db: SupabaseClient, userId: string): Promise<PrepData | null> {
  const data = await loadPrepData(db, userId)
  return data
}


const readinessLine = (d: PrepData) =>
  `Readiness *${d.war.overall}%* — ${readinessTier(d.war).label}` +
  (d.war.interviewReady && !d.war.ready && d.war.blockers[0] ? `\nInterview-ready. Keep closing: *${d.war.blockers[0].label}*` : '')

// Rest day (prep_settings.rest_day): a short message instead of the mission.
function restMorningMessage(): string {
  return [
    `🌿 *REST DAY*`,
    `No plan today. Walk, go to the gym, see people — rest is what keeps a 2–4 month search going.`,
    `The streak carries over.`,
  ].join('\n')
}

// The 7:30am mission, also the Daily bot's "what now" reply.
export function morningMessage(d: PrepData): string {
  if (d.restDay) return restMorningMessage()
  const blocks = d.session?.blocks ?? []
  const risk = d.war.blockers[0]
  const due = d.revision.filter(r => r.status === 'overdue' || r.status === 'today')
  const now = nowBlock(blocks)
  return [
    `🎯 *INTERVIEW WAR MODE — ${levelOf(d.settings.hours_per_day).label} (${d.settings.hours_per_day}h)*`,
    readinessLine(d),
    risk ? `🔴 Biggest risk: *${risk.label}* ${risk.score ?? 'no data'}/${risk.gate}` : null,
    '',
    `*Today's mission (${hm(blocks.reduce((s, b) => s + b.minutes, 0))}, ${dayWindow(d.settings).label}):*`,
    ...blocks.map(b => `${b.done ? '✅' : `${clock(startOf(d, b.key))}`} ${b.label} — ${hm(b.minutes)}`),
    due.length ? `\n🔁 Revision due: ${due.map(r => `${r.topic} (${r.avgRating}/10)`).join(', ')}` : null,
    now ? `\n👉 Start with: *${now.label}*\nReply *START* to begin a focus session.` : null,
    `\n🎙️ Reply *DRILL* for a spoken rep.`,
  ].filter(l => l !== null).join('\n')
}

// The planned start of a block on today's timeline (timeline.ts), in prep minutes.
const startOf = (d: PrepData, key: string) => planTimeline(d.session?.blocks ?? [], dayWindow(d.settings)).find(r => r.blockKey === key)?.start ?? 0

// "what now": the timeline row the clock is in, and the next one.
export function nowLine(d: PrepData): string | null {
  if (d.restDay || !d.session?.blocks.length) return null
  const t = buildTimeline(d.session.blocks, dayWindow(d.settings), prepHourNow())
  const row = (r: TimelineRow) => `*${r.label}* (${span(r)})`
  return [
    t.current ? `🕐 Now: ${row(t.current)}` : `🕐 ${prepHourNow() * 60 < dayWindow(d.settings).start * 60 ? `Your day starts at ${clock(dayWindow(d.settings).start * 60)}.` : 'The timeline is done for today.'}`,
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
