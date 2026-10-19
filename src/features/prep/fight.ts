import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST } from '@/lib/date'
import { speechStats } from '@/lib/speech-stats'
import { critiqueQuestion, SPOKEN_NOTE } from './critique'
import { getQuestionBank, loadPrepData, syncBankBlocks } from './core'
import { CODING_BOSSES, FIGHTS, MIN_ANSWER, fightItems, fightScore, fightWon, fixPoints, winAt, type Fight } from './boss'
import { GATES } from './war'
import { READINESS_AREAS, type PrepSession, type ReadinessAreaKey } from './types'

// Boss Ladder fights (the Bosses tab — extra practice, not part of the daily
// plan) — plain server module (not 'use server'); actions.ts wraps it for
// the web, the Daily bot calls it with the service client. Answers are
// stored as they come; the whole fight is graded at the end in parallel (one
// critique per answer), so nothing is revealed mid-fight. Graded answers
// count as practiced questions, so they also tick the day's "× N" blocks.

const TELEGRAM_IDLE_MS = 30 * 60_000
const label = (area: ReadinessAreaKey) => READINESS_AREAS.find(a => a.key === area)?.label ?? area

export async function getFights(db: SupabaseClient, userId: string, days = 30): Promise<Fight[]> {
  const { data } = await db.from('prep_fights').select('*').eq('user_id', userId).gte('date', daysAgoIST(days)).order('started_at', { ascending: false })
  return (data ?? []) as Fight[]
}

// The running fight; a Telegram one idle for 30 min is abandoned first.
export async function activeFight(db: SupabaseClient, userId: string): Promise<Fight | null> {
  const { data } = await db.from('prep_fights').select('*').eq('user_id', userId).eq('status', 'active').order('started_at', { ascending: false }).limit(1).maybeSingle()
  const f = (data as Fight | null) ?? null
  if (f && f.channel === 'telegram' && Date.now() - new Date(f.updated_at).getTime() > TELEGRAM_IDLE_MS) {
    await abandonFight(db, userId, f.id)
    return null
  }
  return f
}

export async function startFight(db: SupabaseClient, userId: string, area: ReadinessAreaKey, channel: 'web' | 'telegram'): Promise<{ fight: Fight | null; error: string | null }> {
  if (!FIGHTS[area]) return { fight: null, error: 'Not a boss.' }
  const running = await activeFight(db, userId)
  if (running) {
    if (running.channel === channel) return { fight: running, error: null }
    return { fight: null, error: `A ${label(running.area)} fight is running on ${running.channel === 'web' ? 'the web' : 'Telegram'} — finish or give it up there first.` }
  }
  if (channel === 'telegram' && CODING_BOSSES.includes(area)) return { fight: null, error: `${label(area)} is a coding boss — fight it on the web (Prep → Today), solving it in your editor.` }
  const { data: last } = await db.from('prep_fights').select('status, fix_read_at').eq('user_id', userId).eq('area', area)
    .in('status', ['won', 'lost']).order('ended_at', { ascending: false }).limit(1).maybeSingle()
  if (last?.status === 'lost' && !last.fix_read_at) return { fight: null, error: `Read the Fix card from your last ${label(area)} fight first — the rematch unlocks after.` }

  const items = fightItems(area, await getQuestionBank(db, userId), todayIST())
  if (items.length === 0) return { fight: null, error: `No ${label(area)} questions left that you haven't answered today.` }
  const { data, error } = await db.from('prep_fights')
    .insert({ user_id: userId, date: todayIST(), area, channel, items, gate: GATES[area].gate })
    .select('*').single()
  if (error) return { fight: null, error: error.message }
  return { fight: data as Fight, error: null }
}

// Stores the current answer and moves on; the last one ends the fight
// (`session` = today's plan after its question blocks were re-synced).
export async function answerFight(db: SupabaseClient, userId: string, id: string, answer: string, opts: { spoken?: boolean; seconds?: number } = {}): Promise<{ fight: Fight | null; session: PrepSession | null }> {
  const { data } = await db.from('prep_fights').select('*').eq('id', id).eq('user_id', userId).single()
  const f = data as Fight | null
  if (!f || f.status !== 'active') return { fight: f, session: null }
  const items = f.items.map((it, i) => i === f.current ? { ...it, answer: answer.trim(), spoken: !!opts.spoken, seconds: Math.max(0, Math.round(opts.seconds ?? 0)) } : it)
  const current = f.current + 1
  const { data: saved } = await db.from('prep_fights').update({ items, current, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'active').select('*').single()
  if (!saved) return { fight: null, session: null }
  return current >= items.length ? finishFight(db, userId, saved as Fight) : { fight: saved as Fight, session: null }
}

export async function abandonFight(db: SupabaseClient, userId: string, id: string): Promise<Fight | null> {
  const now = new Date().toISOString()
  const { data } = await db.from('prep_fights').update({ status: 'abandoned', ended_at: now, updated_at: now }).eq('id', id).eq('user_id', userId).eq('status', 'active').select('*').maybeSingle()
  return (data as Fight | null) ?? null
}

export async function markFixRead(db: SupabaseClient, userId: string, id: string): Promise<Fight | null> {
  const { data } = await db.from('prep_fights').update({ fix_read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).is('fix_read_at', null).select('*').maybeSingle()
  return (data as Fight | null) ?? null
}

// Grades every answer (blank ones get no AI call and no rating), decides
// won/lost, keeps the Fix card, writes the ratings to question_progress and
// re-syncs the day's question blocks for those categories.
async function finishFight(db: SupabaseClient, userId: string, f: Fight): Promise<{ fight: Fight | null; session: PrepSession | null }> {
  const graded = await Promise.all(f.items.map(async it => {
    if (!it.answer) return it
    const { seconds, fillers } = speechStats(it.answer)
    const r = await critiqueQuestion(db, userId, it.question_id, it.answer, it.spoken ? SPOKEN_NOTE(seconds, fillers) : '')
    return { ...it, rating: r.rating, card: r.card }
  }))
  const won = fightWon(graded, f.gate)
  const now = new Date().toISOString()
  const { data } = await db.from('prep_fights').update({
    items: graded, status: won ? 'won' : 'lost', score: fightScore(graded),
    fix: won ? null : fixPoints(graded), ended_at: now, updated_at: now,
  }).eq('id', f.id).select('*').single()

  const answered = graded.filter(it => it.answer)
  if (answered.length > 0) {
    const { data: prev } = await db.from('question_progress').select('question_id, attempts').eq('user_id', userId).in('question_id', answered.map(it => it.question_id))
    const attempts = new Map((prev ?? []).map(p => [p.question_id as string, p.attempts as number]))
    await db.from('question_progress').upsert(answered.map(it => ({
      user_id: userId, question_id: it.question_id,
      attempts: (attempts.get(it.question_id) ?? 0) + 1, last_answer: it.answer, last_seen_at: now,
      ...(it.rating !== null ? { last_rating: it.rating, last_rated_at: now } : {}),
    })), { onConflict: 'user_id,question_id' })
  }
  const session = answered.length ? await syncBankBlocks(db, userId, [...new Set(answered.map(it => it.category))]) : null
  return { fight: (data as Fight | null) ?? null, session }
}

// ---------------- Telegram (Daily bot) ----------------

const ALIASES: [RegExp, ReadinessAreaKey][] = [
  [/system|design|hld/i, 'sysdesign'],
  [/type ?script|\bts\b/i, 'ts'],
  [/react|next/i, 'react'],
  [/\bcss\b|layout/i, 'css'],
  [/a11y|accessib/i, 'a11y'],
  [/perf/i, 'perf'],
  [/test/i, 'testing'],
  [/browser|network|security|dom/i, 'browser'],
  [/code ?review|ai.?assisted|\bpr\b/i, 'aiassisted'],
  [/\bai\b|ai.?native/i, 'ainative'],
  [/backend|\bapis?\b|server|node/i, 'backend'],
  [/behaviou?ral|\bfit\b|resume|story/i, 'behavioral'],
  [/lead/i, 'leadership'],
  [/ui|machine/i, 'uicoding'],
  [/algo|dsa/i, 'dsa'],
  [/\bjs\b|javascript/i, 'js'],
]
export const fightArea = (text: string | undefined): ReadinessAreaKey | null => text ? ALIASES.find(([re]) => re.test(text))?.[1] ?? null : null

export function fightQuestionText(f: Fight): string {
  const it = f.items[f.current]
  const prompt = it.category === 'system-design'
    ? `Design the frontend for *${it.title}* — requirements, component architecture, state and data flow, performance, trade-offs.`
    : it.title
  return `⚔️ *${label(f.area)}* · ${f.current + 1}/${f.items.length} · ~${Math.round(it.budget_seconds / 60)} min\n\n${prompt}${it.body ? `\n\n\`\`\`\n${it.body.slice(0, 2500)}\n\`\`\`` : ''}\n\nAnswer with a voice note or text. *SKIP* gives up the fight.`
}

export function fightResultText(f: Fight): string {
  const won = f.status === 'won'
  const lines = [
    `${won ? '🏆 *BOSS DEFEATED*' : '💀 *LOST*'} — ${label(f.area)}`,
    `Avg *${f.score ?? 0}*/10 · need ${winAt(f.gate).toFixed(1)}, none under ${MIN_ANSWER}`,
    '',
    ...f.items.map((it, i) => `${i + 1}. ${it.rating ?? '—'}/10 · ${it.title}`),
  ]
  if (!won) {
    if (f.fix?.length) {
      lines.push('', '*Fix card* — what the answers missed:')
      for (const p of f.fix.slice(0, 12)) lines.push(`${p.status === 'missing' ? '✗' : '◐'} ${p.point}${p.note ? ` — ${p.note}` : ''}`)
    }
    lines.push('', 'Reply *READ* once you\'ve gone through it — the rematch unlocks then.')
  }
  return lines.join('\n')
}

// "fight" / "fight system design": the named boss, else the top undefeated
// spoken boss on the ladder.
export async function startTelegramFight(db: SupabaseClient, userId: string, requested: ReadinessAreaKey | null): Promise<string> {
  let area = requested
  if (!area) {
    const data = await loadPrepData(db, userId)
    area = data.ladder.find(b => b.state !== 'defeated' && !CODING_BOSSES.includes(b.key))?.key ?? null
    if (!area) return '🏆 Every spoken boss is down — the coding bosses are on the web (Prep → Bosses).'
  }
  const { fight, error } = await startFight(db, userId, area, 'telegram')
  if (!fight) return `❌ ${error}`
  return fightQuestionText(fight)
}

// Runs before intent parsing: while a Telegram fight is active, every message
// is its next answer (SKIP gives up).
export async function answerTelegramFight(db: SupabaseClient, userId: string, text: string, spoken: boolean): Promise<string | null> {
  const f = await activeFight(db, userId)
  if (!f || f.channel !== 'telegram') return null
  const t = text.trim()
  // "what now" still answers mid-fight.
  if (/^(what now|status)\??$/i.test(t)) return null
  if (/^(skip|give up|stop|quit)\.?$/i.test(t)) {
    await abandonFight(db, userId, f.id)
    return `🏳️ Gave up the ${label(f.area)} fight — it doesn't count. Reply *FIGHT* to start again.`
  }
  const { fight: next } = await answerFight(db, userId, f.id, t, { spoken })
  if (!next) return '❌ Couldn\'t save that answer — try again.'
  return next.status === 'active' ? `✓ Saved.\n\n${fightQuestionText(next)}` : fightResultText(next)
}

// "read": marks the newest unread Fix card read.
export async function readTelegramFix(db: SupabaseClient, userId: string): Promise<string> {
  const { data } = await db.from('prep_fights').select('id, area').eq('user_id', userId).eq('status', 'lost').is('fix_read_at', null)
    .order('ended_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) return 'No unread Fix card.'
  await markFixRead(db, userId, data.id)
  return `✅ Fix card read — *${label(data.area as ReadinessAreaKey)}* rematch unlocked. Reply *FIGHT ${label(data.area as ReadinessAreaKey).toUpperCase()}* when ready.`
}
