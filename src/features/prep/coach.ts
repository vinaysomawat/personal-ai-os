import type { SupabaseClient } from '@supabase/supabase-js'
import { toPrepDateStr } from '@/lib/date'
import { loadPrepData } from './core'
import { clock, GATES, GOOD_DAY_BLOCKS, coachLine, isGoodDay, dayPace, dayWindow, focusedMinutes, hm, prepHourNow, nowBlock, practicedToday, readinessTier } from './war'
import { levelOf } from './hunt'
import { buildTimeline, overHint, planTimeline, span, type TimelineRow } from './timeline'

// Telegram Prep Coach (War Mode) — deterministic message builders for the
// Daily bot's 7:30am / 6:30pm / 1:05am crons and its START/DONE/"what now"
// replies. War Mode is always on, so coachData always returns the data.

type PrepData = NonNullable<Awaited<ReturnType<typeof loadPrepData>>>


export async function coachData(db: SupabaseClient, userId: string): Promise<PrepData | null> {
  const data = await loadPrepData(db, userId)
  return data
}

const paceAt = (d: PrepData, hour: number) => dayPace(d.session?.blocks ?? [], hour, { answered: practicedToday(d.bank, d.today), focused: focusedMinutes(d.focusSessions, d.today) }, dayWindow(d.settings))

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

// A midway check-in (6:30pm), only when ≥30 min under the day window's pace
// — otherwise silent. What's done, then the one next step.
export function middayMessage(d: PrepData): string | null {
  if (d.restDay) return null
  const pace = paceAt(d, prepHourNow())
  if (pace.deltaMinutes > -30) return null
  const now = nowBlock(d.session?.blocks ?? [])
  return [
    `🕐 *Check-in:* ${pace.blocksDone}/${pace.blocksTotal} blocks done (${pace.donePct}% of the plan).`,
    now ? `👉 Next: *${now.label}* — ${hm(now.minutes)}\nReply *START* when you're ready.` : null,
  ].filter(l => l !== null).join('\n')
}

export function eveningMessage(d: PrepData): string {
  if (d.restDay) return `🌙 *REST DAY*\nTomorrow's plan comes at 7:30am. Sleep well.`
  const today = d.focusSessions.filter(f => f.date === d.today)
  // The day review: judged as if the window were over.
  const pace = paceAt(d, dayWindow(d.settings).end)
  const interruptions = today.reduce((s, f) => s + f.interruptions, 0)
  const mocks = d.mockRounds.filter(r => toPrepDateStr(r.created_at) === d.today && r.review?.score != null)
  const strong = d.readiness.filter(c => c.score !== null && c.score >= GATES[c.key].gate)
  const weak = d.war.blockers.slice(0, 3)
  const blocks = d.session?.blocks ?? []
  const good = isGoodDay(blocks)
  return [
    `🌙 *DAY REVIEW — ${levelOf(d.settings.hours_per_day).label}*`,
    `Done: *${pace.blocksDone}/${pace.blocksTotal} blocks* (${pace.donePct}% of the plan)${interruptions ? ` · ${interruptions} interruption${interruptions === 1 ? '' : 's'}` : ''}`,
    good ? `✓ *Good day*` : `A good day = ${GOOD_DAY_BLOCKS} blocks.`,
    // Mocks run 3 days a week — no line on the other days unless one was done.
    ...(mocks.length ? [`Mock: ${mocks.map(r => `${r.review!.score}/10`).join(', ')}`] : blocks.some(b => b.key === 'mock') ? ['Mock: none reviewed today'] : []),
    readinessLine(d),
    '',
    strong.length ? `Strong: ${strong.slice(0, 3).map(c => `🟢 ${c.label}`).join(' ')}` : 'Strong: nothing at its gate yet.',
    weak.length ? `Focus next: ${weak.map(b => `🔴 ${b.label} ${b.score ?? '—'}/${b.gate}`).join(' ')}` : null,
    weak.length ? `\nTomorrow shifts time toward: ${weak.map(b => b.label).join(', ')}.` : null,
    '',
    `_${coachLine(pace, nowBlock(blocks), good)}_`,
  ].filter(l => l !== null).join('\n')
}

// ---------------- Still open (absorbed from the evening check-in) ----------------

// One compact line for the 1:05am day review: no expense logged today, a daily
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
