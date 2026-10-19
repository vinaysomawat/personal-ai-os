import type { SupabaseClient } from '@supabase/supabase-js'
import { toISTDateStr } from '@/lib/date'
import { loadPrepData } from './core'
import type { PipelineStatus } from '@/features/career/pipeline-status'
import { coachLine, dayPace, hm, nowBlock, readinessTier } from './war'
import { levelOf } from './hunt'
import { CODING_BOSSES, bossesLeft, bossesPerDay, daysTo } from './boss'

// Telegram Prep Coach (Boss Ladder) — deterministic message builders for the
// Daily bot's 7:30am / 1pm / 9:30pm crons and its "what now" reply. War Mode
// is always on, so coachData always returns the data.

type PrepData = NonNullable<Awaited<ReturnType<typeof loadPrepData>>>


export async function coachData(db: SupabaseClient, userId: string): Promise<PrepData | null> {
  const data = await loadPrepData(db, userId)
  return data
}

const readinessLine = (d: PrepData) =>
  `Readiness *${d.war.overall}%* — ${readinessTier(d.war).label}` +
  (d.war.interviewReady && !d.war.ready && d.war.blockers[0] ? `\nInterview-ready. Keep closing: *${d.war.blockers[0].label}*` : '')

// "⚔️ 9 bosses left · 11 days to 30 Oct · need 0.8/day"
export function ladderLine(d: PrepData): string {
  const left = bossesLeft(d.ladder)
  const days = daysTo(d.settings.target_date, d.today)
  const per = bossesPerDay(left, days)
  const when = d.settings.target_date ? new Date(`${d.settings.target_date}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : null
  return `⚔️ *${left} boss${left === 1 ? '' : 'es'} left*${days !== null ? ` · ${days} day${days === 1 ? '' : 's'} to ${when}${per !== null ? ` · need ${per}/day` : ''}` : ''}`
}

// What to reply to start the next block: FIGHT for a spoken boss, else the web.
function startLine(d: PrepData): string | null {
  const now = nowBlock(d.session?.blocks ?? [])
  if (!now) return null
  const area = now.key.startsWith('fight:') ? now.key.slice(6) : null
  return area && !CODING_BOSSES.includes(area as never)
    ? `👉 Next: *${now.label}*\nReply *FIGHT* to start it here.`
    : `👉 Next: *${now.label}* — on the web (Prep → ${now.key.startsWith('mock') ? 'Mock Round' : 'Today'}).`
}

// `pipeline` (debriefs owed) is added by the 7:30am cron; "what now" on the Daily bot omits it.
export function morningMessage(d: PrepData, pipeline?: PipelineStatus): string {
  const blocks = d.session?.blocks ?? []
  const due = d.revision.filter(r => r.status === 'overdue' || r.status === 'today')
  const level = levelOf(d.settings.hours_per_day)
  const start = startLine(d)
  return [
    `🎯 *BOSS LADDER — ${level.label} (${level.fights} fights)*`,
    readinessLine(d),
    ladderLine(d),
    d.companyBlock ? `🏢 *Company prep first:* ${d.companyBlock.label}` : null,
    d.nextInterview ? `📅 Next interview: *${d.nextInterview.company}* ${d.nextInterview.kind.replace(/_/g, ' ')} — ${new Date(d.nextInterview.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}` : null,
    '',
    `*Today's fights (${hm(blocks.reduce((s, b) => s + b.minutes, 0))}):*`,
    ...blocks.map((b, i) => `${b.done ? '✅' : `${i + 1}.`} ${b.label} — ${hm(b.minutes)}`),
    pipeline?.debriefsOwed.length ? `\n📝 Debrief owed (Career bot): ${pipeline.debriefsOwed.map(r => `${r.company} ${r.kind.replace(/_/g, ' ')}`).join(', ')}` : null,
    due.length ? `\n🔁 Revision due: ${due.map(r => `${r.topic} (${r.avgRating}/10)`).join(', ')}` : null,
    start ? `\n${start}` : null,
    `\n🎙️ Reply *DRILL* for a single spoken rep.`,
  ].filter(l => l !== null).join('\n')
}

// 1pm: only when no fight (or mock) is done yet — otherwise silent.
export function middayMessage(d: PrepData): string | null {
  const blocks = d.session?.blocks ?? []
  if (blocks.length === 0 || blocks.some(b => b.done)) return null
  const start = startLine(d)
  return [
    `⚠️ *1pm and no fight done yet.*`,
    ladderLine(d),
    '',
    `Bosses don't fall on their own.`,
    start,
  ].filter(l => l !== null).join('\n')
}

export function eveningMessage(d: PrepData): string {
  const pace = dayPace(d.session?.blocks ?? [], 23)
  const fought = d.fights.filter(f => f.date === d.today && (f.status === 'won' || f.status === 'lost'))
  const beaten = d.ladder.filter(b => b.state === 'defeated' && b.lastFight?.date === d.today)
  const mocks = d.mockRounds.filter(r => toISTDateStr(r.created_at) === d.today && r.review?.score != null)
  const next = d.ladder.find(b => b.state !== 'defeated')
  return [
    `🌙 *DAY REVIEW — ${levelOf(d.settings.hours_per_day).label}*`,
    `Plan: ${pace.blocksDone}/${pace.blocksTotal} done (${pace.donePct}%)`,
    fought.length ? `Fights: ${fought.map(f => `${f.status === 'won' ? '🏆' : '💀'} ${d.ladder.find(b => b.key === f.area)?.label ?? f.area} ${f.score}/10`).join(' · ')}` : 'Fights: none today',
    beaten.length ? `Defeated today: ${beaten.map(b => `✅ ${b.label}`).join(' ')}` : null,
    mocks.length ? `Mock: ${mocks.map(r => `${r.review!.score}/10`).join(', ')}` : `Mock: none reviewed today`,
    readinessLine(d),
    ladderLine(d),
    next ? `\nTomorrow's first boss: *${next.label}* ${next.score ?? '—'}/${next.gate}${next.state === 'fix' ? ' — read its Fix card first (reply *READ*)' : ''}.` : '\n🏆 Every boss down — tomorrow is the final boss: a full mock loop.',
    '',
    `_${coachLine(pace)}_`,
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
