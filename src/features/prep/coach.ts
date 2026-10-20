import type { SupabaseClient } from '@supabase/supabase-js'
import { toISTDateStr } from '@/lib/date'
import { loadPrepData } from './core'
import type { PipelineStatus } from '@/features/career/pipeline-status'
import { GATES, blockQuota, coachLine, isGoodDay, dayPace, hm, istHourNow, nowBlock, practicedToday, readinessTier } from './war'
import { levelOf } from './hunt'
import { bossesLeft, bossesPerDay, daysTo } from './boss'
import { LOW_MOOD_LINE } from '@/features/health/mood'

// Telegram Prep Coach (War Mode) — deterministic message builders for the
// Daily bot's 7:30am / 1pm / 9:30pm crons and its START/DONE/"what now"
// replies. War Mode is always on, so coachData always returns the data.

type PrepData = NonNullable<Awaited<ReturnType<typeof loadPrepData>>>


export async function coachData(db: SupabaseClient, userId: string): Promise<PrepData | null> {
  const data = await loadPrepData(db, userId)
  return data
}

const paceAt = (d: PrepData, hour: number) => dayPace(d.session?.blocks ?? [], hour, { ...practicedToday(d.bank, d.today), outreach: d.outreachToday })

const readinessLine = (d: PrepData) =>
  `Readiness *${d.war.overall}%* — ${readinessTier(d.war).label}` +
  (d.war.interviewReady && !d.war.ready && d.war.blockers[0] ? `\nInterview-ready. Keep closing: *${d.war.blockers[0].label}*` : '')

// "⚔️ 9 bosses left · 11 days to 30 Oct · need 0.8/day" (Bosses tab).
export function ladderLine(d: PrepData): string {
  const left = bossesLeft(d.ladder)
  const days = daysTo(d.settings.target_date, d.today)
  const per = bossesPerDay(left, days)
  const when = d.settings.target_date ? new Date(`${d.settings.target_date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null
  return `⚔️ ${left} boss${left === 1 ? '' : 'es'} left${days !== null ? ` · ${days} day${days === 1 ? '' : 's'} to ${when}${per !== null ? ` · need ${per}/day` : ''}` : ''} — reply *FIGHT*`
}

// Rest day (prep_settings.rest_day): a short message instead of the mission.
function restMorningMessage(): string {
  return [
    `🌿 *REST DAY*`,
    `No plan today. Walk, go to the gym, see people — rest is what keeps a 2–4 month search going.`,
    `The streak carries over. Tomorrow starts with outreach.`,
  ].join('\n')
}

// The week so far (Monday-start IST) for the rest-day evening message.
export interface WeekSummary { sent: number; target: number; replies: number; screens: number; rounds: number }
export async function weekSummary(db: SupabaseClient, userId: string, pipeline: PipelineStatus): Promise<WeekSummary> {
  const { count } = await db.from('interview_rounds').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    .neq('status', 'cancelled').gte('scheduled_at', `${pipeline.week.week}T00:00:00+05:30`).lt('scheduled_at', new Date().toISOString())
  return { sent: pipeline.week.sent, target: pipeline.target, replies: pipeline.week.replies, screens: pipeline.week.screens, rounds: count ?? 0 }
}

function restEveningMessage(w: WeekSummary | undefined): string {
  return [
    `🌙 *REST DAY — the week so far*`,
    w ? `📤 Outreach: *${w.sent}/${w.target}* · ${w.replies} repl${w.replies === 1 ? 'y' : 'ies'} · ${w.screens} screen${w.screens === 1 ? '' : 's'}` : null,
    w ? `📞 Interview rounds this week: *${w.rounds}*` : null,
    '',
    `Tomorrow starts with outreach. Enjoy the evening.`,
  ].filter(l => l !== null).join('\n')
}

// `pipeline` (debriefs owed) and `lowMood` (mood ≤2 on 5 of the last 7 days
// — one gentle support line) are added by the 7:30am cron; "what now" on the
// Daily bot omits them.
export function morningMessage(d: PrepData, pipeline?: PipelineStatus, lowMood = false): string {
  if (d.restDay) return `${restMorningMessage()}${lowMood ? `\n\n${LOW_MOOD_LINE}` : ''}`
  const blocks = d.session?.blocks ?? []
  const risk = d.war.blockers[0]
  const due = d.revision.filter(r => r.status === 'overdue' || r.status === 'today')
  const now = nowBlock(blocks)
  const outreach = blocks.find(b => b.key === 'outreach')
  return [
    `🎯 *INTERVIEW WAR MODE — ${levelOf(d.settings.hours_per_day).label} (${d.settings.hours_per_day}h)*`,
    outreach ? (outreach.done ? `📤 Outreach done: ${d.outreachToday}/${blockQuota(outreach)} ✅` : `📤 *Start with outreach: ${d.outreachToday}/${blockQuota(outreach)}* — 5 referral messages + 5 roles posted in the last 48h`) : null,
    readinessLine(d),
    ladderLine(d),
    risk ? `🔴 Biggest risk: *${risk.label}* ${risk.score ?? 'no data'}/${risk.gate}` : null,
    d.companyBlock ? `🏢 *Then company prep:* ${d.companyBlock.label}` : null,
    d.nextInterview ? `📅 Next interview: *${d.nextInterview.company}* ${d.nextInterview.kind.replace(/_/g, ' ')} — ${new Date(d.nextInterview.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : null,
    '',
    `*Today's mission (${hm(blocks.reduce((s, b) => s + b.minutes, 0))}):*`,
    ...blocks.map((b, i) => `${b.done ? '✅' : `${i + 1}.`} ${b.label} — ${hm(b.minutes)}`),
    pipeline?.debriefsOwed.length ? `\n📝 Debrief owed (Career bot): ${pipeline.debriefsOwed.map(r => `${r.company} ${r.kind.replace(/_/g, ' ')}`).join(', ')}` : null,
    due.length ? `\n🔁 Revision due: ${due.map(r => `${r.topic} (${r.avgRating}/10)`).join(', ')}` : null,
    now ? `\n👉 Start with: *${now.label}*\nReply *START* to begin a focus session.` : null,
    `\n🎙️ Reply *DRILL* for a spoken rep.`,
    lowMood ? `\n${LOW_MOOD_LINE}` : null,
  ].filter(l => l !== null).join('\n')
}

// A 1pm check-in, only when ≥30 min under the PACE_WINDOW (9am–7pm) pace —
// otherwise silent. What's done, then the one next step.
export function middayMessage(d: PrepData): string | null {
  if (d.restDay) return null
  const pace = paceAt(d, istHourNow())
  if (pace.deltaMinutes > -30) return null
  const now = nowBlock(d.session?.blocks ?? [])
  return [
    `🕐 *1pm check-in:* ${pace.blocksDone}/${pace.blocksTotal} blocks done (${pace.donePct}% of the plan).`,
    now ? `👉 Next: *${now.label}* — ${hm(now.minutes)}\nReply *START* when you're ready.` : null,
  ].filter(l => l !== null).join('\n')
}

// `week` (outreach / calls so far) is passed by the 9:30pm cron for the rest-day message.
export function eveningMessage(d: PrepData, week?: WeekSummary): string {
  if (d.restDay) return restEveningMessage(week)
  const today = d.focusSessions.filter(f => f.date === d.today)
  const pace = paceAt(d, 23)
  const interruptions = today.reduce((s, f) => s + f.interruptions, 0)
  const mocks = d.mockRounds.filter(r => toISTDateStr(r.created_at) === d.today && r.review?.score != null)
  const strong = d.readiness.filter(c => c.score !== null && c.score >= GATES[c.key].gate)
  const weak = d.war.blockers.slice(0, 3)
  const blocks = d.session?.blocks ?? []
  const good = isGoodDay(blocks)
  const outreach = blocks.find(b => b.key === 'outreach')
  return [
    `🌙 *DAY REVIEW — ${levelOf(d.settings.hours_per_day).label}*`,
    `Done: *${pace.blocksDone}/${pace.blocksTotal} blocks* (${pace.donePct}% of the plan)${interruptions ? ` · ${interruptions} interruption${interruptions === 1 ? '' : 's'}` : ''}`,
    outreach ? `📤 Outreach: ${d.outreachToday}/${blockQuota(outreach)}${outreach.done ? ' ✅' : ''}` : null,
    good ? `✓ *Good day* — outreach + ${blocks.filter(b => b.key !== 'outreach' && b.done).length} blocks.` : `A good day = outreach + 2 blocks.`,
    mocks.length ? `Mock: ${mocks.map(r => `${r.review!.score}/10`).join(', ')}` : `Mock: none reviewed today`,
    readinessLine(d),
    ladderLine(d),
    '',
    strong.length ? `Strong: ${strong.slice(0, 3).map(c => `🟢 ${c.label}`).join(' ')}` : 'Strong: nothing at its gate yet.',
    weak.length ? `Focus next: ${weak.map(b => `🔴 ${b.label} ${b.score ?? '—'}/${b.gate}`).join(' ')}` : null,
    weak.length ? `\nTomorrow shifts time toward: ${weak.map(b => b.label).join(', ')}.` : null,
    '',
    `_${coachLine(pace, nowBlock(blocks), good)}_`,
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

// ---------------- Post-interview debrief (v4.0 §4.3) ----------------

// Rounds that started 1–36h ago, are scheduled or done, have no questions
// logged and no debrief sent yet get one Career-bot prompt each.
export async function sendDebriefPrompts(db: SupabaseClient, userId: string, nowMs = Date.now()): Promise<number> {
  const { sendMessage } = await import('@/lib/telegram/send')
  const { data } = await db.from('interview_rounds')
    .select('id, kind, scheduled_at, application:applications(company)')
    .eq('user_id', userId).in('status', ['scheduled', 'done']).is('debrief_sent_at', null)
    .gte('scheduled_at', new Date(nowMs - 36 * 3600_000).toISOString())
    .lte('scheduled_at', new Date(nowMs - 3600_000).toISOString())
  const rounds = (data ?? []) as unknown as { id: string; kind: string; scheduled_at: string; application: { company: string } | null }[]
  let sent = 0
  for (const r of rounds) {
    const { count } = await db.from('interview_questions').select('id', { count: 'exact', head: true }).eq('round_id', r.id)
    if (count) continue
    // Claim first so a retry never double-sends.
    const { data: claimed } = await db.from('interview_rounds').update({ debrief_sent_at: new Date(nowMs).toISOString() }).eq('id', r.id).is('debrief_sent_at', null).select('id')
    if (!claimed?.length) continue
    await sendMessage(process.env.TELEGRAM_BOT_TOKEN_CAREER!, Number(process.env.TELEGRAM_ALLOWED_CHAT_ID),
      `📝 How did the *${r.application?.company ?? 'interview'}* ${r.kind.replace(/_/g, ' ')} round go?\n\nReply with what they asked (voice is fine): one question per line, plus how each went — e.g. "design an autocomplete — went ok".`)
    sent++
  }
  return sent
}
