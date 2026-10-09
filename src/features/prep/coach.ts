import type { SupabaseClient } from '@supabase/supabase-js'
import { toISTDateStr } from '@/lib/date'
import { loadPrepData } from './core'
import { GATES, coachLine, dayPace, focusSeconds, hm, nowBlock } from './war'

// Telegram Prep Coach (War Mode) — deterministic message builders for the
// Daily bot's 7:30am / 1pm / 9:30pm crons and its START/DONE/"what now"
// replies. Silent (null) when Job Hunt Mode is off.

type PrepData = NonNullable<Awaited<ReturnType<typeof loadPrepData>>>

const istHourNow = () => { const d = new Date(Date.now() + 5.5 * 3600_000); return d.getUTCHours() + d.getUTCMinutes() / 60 }

export async function coachData(db: SupabaseClient, userId: string): Promise<PrepData | null> {
  const data = await loadPrepData(db, userId)
  return data.settings.target_date ? data : null
}

const focusedToday = (d: PrepData) => Math.round(d.focusSessions.filter(f => f.date === d.today).reduce((s, f) => s + focusSeconds(f), 0) / 60)

const readinessLine = (d: PrepData) =>
  `Readiness *${d.war.overall}%* — ${d.war.ready ? '🔥 TOP 1% READY' : `❌ NOT READY (${d.war.blockers.length} blocker${d.war.blockers.length === 1 ? '' : 's'})`}`

export function morningMessage(d: PrepData): string {
  const blocks = d.session?.blocks ?? []
  const risk = d.war.blockers[0]
  const due = d.revision.filter(r => r.status === 'overdue' || r.status === 'today')
  const now = nowBlock(blocks)
  return [
    `🎯 *INTERVIEW WAR MODE — D-${d.daysLeft}*`,
    readinessLine(d),
    risk ? `🔴 Biggest risk: *${risk.label}* ${risk.score ?? 'no data'}/${risk.gate}` : null,
    d.nextInterview ? `📅 Next interview: *${d.nextInterview.company}* ${d.nextInterview.kind.replace(/_/g, ' ')} — ${new Date(d.nextInterview.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : null,
    '',
    `*Today's mission (${hm(blocks.reduce((s, b) => s + b.minutes, 0))}):*`,
    ...blocks.map((b, i) => `${b.done ? '✅' : `${i + 1}.`} ${b.label} — ${hm(b.minutes)}`),
    due.length ? `\n🔁 Revision due: ${due.map(r => `${r.topic} (${r.avgRating}/10)`).join(', ')}` : null,
    now ? `\n👉 Start with: *${now.label}*\nReply *START* to begin a focus session.` : null,
  ].filter(l => l !== null).join('\n')
}

// Only when ≥30 min behind the 9am–9pm pace — otherwise silent.
export function middayMessage(d: PrepData): string | null {
  const pace = dayPace(d.session?.blocks ?? [], focusedToday(d), istHourNow())
  if (pace.behindMinutes < 30) return null
  const now = nowBlock(d.session?.blocks ?? [])
  return [
    `⚠️ *You're ${hm(pace.behindMinutes)} behind today's plan.*`,
    `Done ${hm(pace.doneMinutes)} · expected by now ${hm(pace.expectedMinutes)} · focused ${hm(pace.focusedMinutes)}`,
    `Blocks ${pace.blocksDone}/${pace.blocksTotal}.`,
    '',
    `Don't catch up with random work.`,
    now ? `👉 Next: *${now.label}* — ${hm(now.minutes)}\nReply *START* when you're ready.` : null,
  ].filter(l => l !== null).join('\n')
}

export function eveningMessage(d: PrepData): string {
  const blocks = d.session?.blocks ?? []
  const today = d.focusSessions.filter(f => f.date === d.today)
  const pace = dayPace(blocks, focusedToday(d), 23)
  const interruptions = today.reduce((s, f) => s + f.interruptions, 0)
  const mocks = d.mockRounds.filter(r => toISTDateStr(r.created_at) === d.today && r.review?.score != null)
  const strong = d.readiness.filter(c => c.score !== null && c.score >= GATES[c.key].gate)
  const weak = d.war.blockers.slice(0, 3)
  return [
    `🌙 *DAY REVIEW — D-${d.daysLeft}*`,
    `Focused: *${hm(pace.focusedMinutes)}* / ${hm(pace.plannedMinutes)} planned${interruptions ? ` · ${interruptions} interruption${interruptions === 1 ? '' : 's'}` : ''}`,
    `Blocks: ${pace.blocksDone}/${pace.blocksTotal} (${pace.blocksTotal ? Math.round((pace.blocksDone / pace.blocksTotal) * 100) : 0}%)`,
    mocks.length ? `Mock: ${mocks.map(r => `${r.review!.score}/10`).join(', ')}` : `Mock: none reviewed today`,
    readinessLine(d),
    '',
    strong.length ? `Strong: ${strong.slice(0, 3).map(c => `🟢 ${c.label}`).join(' ')}` : 'Strong: nothing at its gate yet.',
    weak.length ? `Needs work: ${weak.map(b => `🔴 ${b.label} ${b.score ?? '—'}/${b.gate}`).join(' ')}` : null,
    weak.length ? `\nTomorrow shifts time toward: ${weak.map(b => b.label).join(', ')}.` : null,
    '',
    `_${coachLine(pace, 23)}_`,
  ].filter(l => l !== null).join('\n')
}

// ---------------- Still open (absorbed from the evening check-in) ----------------

// One compact line for the 9:30pm message: no expense logged today, a daily
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
