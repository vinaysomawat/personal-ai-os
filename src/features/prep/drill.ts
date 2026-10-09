import type { SupabaseClient } from '@supabase/supabase-js'
import { speechStats } from '@/lib/speech-stats'
import { critiqueQuestion } from './critique'
import { loadPrepData, syncBankBlocks } from './core'
import { categoryGap } from './war'
import type { BankQuestion } from './types'

// Voice drill over Telegram (v4.0 §4.6): the Daily bot asks one spoken-answer
// question, the next message (voice or text) within 30 minutes is the answer,
// and it comes back rated with delivery stats. Rows live in telegram_drills;
// the rating also lands in question_progress like a Question Bank answer.

// Categories that make sense answered out loud — coding categories don't.
const SPOKEN = ['behavioral', 'ai-native', 'system-design', 'quiz', 'angular', 'interview'] as const
const ALIASES: [RegExp, string][] = [
  [/system|design|hld/i, 'system-design'],
  [/behaviou?ral|\bfit\b|\bhr\b|story/i, 'behavioral'],
  [/interview|real|asked/i, 'interview'],
  [/\bai\b/i, 'ai-native'],
  [/angular/i, 'angular'],
  [/theory|quiz|js|react|frontend/i, 'quiz'],
]
const ANSWER_WINDOW_MS = 30 * 60_000

export function drillCategory(text: string | undefined): string | null {
  if (!text) return null
  return ALIASES.find(([re]) => re.test(text))?.[1] ?? null
}

// Least-recently-strong first: rated under 7, then never practiced, then the
// one practiced longest ago.
function pickQuestion(bank: BankQuestion[], category: string, skip: Set<string>): BankQuestion | null {
  const pool = bank.filter(q => q.category === category && !skip.has(q.id))
  const rank = (q: BankQuestion) => q.last_rating !== null && q.last_rating < 7 ? 0 : q.last_seen_at === null ? 1 : 2
  return pool.sort((a, b) => rank(a) - rank(b) || (a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? ''))[0] ?? null
}

export async function startDrill(db: SupabaseClient, userId: string, requested: string | null): Promise<string> {
  const data = await loadPrepData(db, userId)
  // Default: the spoken category with the biggest readiness gap.
  const category = requested ?? [...SPOKEN].filter(c => c !== 'interview')
    .sort((a, b) => categoryGap(b, data.readiness) - categoryGap(a, data.readiness))[0]
  const { data: recent } = await db.from('telegram_drills').select('question_id').eq('user_id', userId)
    .gte('asked_at', new Date(Date.now() - 7 * 86400_000).toISOString())
  const q = pickQuestion(data.bank, category, new Set((recent ?? []).map(r => r.question_id as string)))
  if (!q) return `No ${category} questions left to drill this week — try "drill behavioral" or "drill system design".`
  // A new drill supersedes any unanswered one.
  await db.from('telegram_drills').update({ answered_at: new Date().toISOString() }).eq('user_id', userId).is('answered_at', null)
  const { error } = await db.from('telegram_drills').insert({ user_id: userId, question_id: q.id })
  if (error) return `❌ ${error.message}`
  const prompt = category === 'system-design'
    ? `Design the frontend for *${q.title}* — requirements, component architecture, state and data flow, performance, trade-offs.`
    : q.title
  return `🎙️ *Drill · ${category}*\n\n${prompt}\n\nAnswer with a voice note (aim for 60–120s) within 30 min. Reply *SKIP* to pass.`
}

// Bot commands that must never be swallowed as a drill answer.
const COMMANDS = /^(start|begin|pause|resume|break|back|done|finish(ed)?|stop|what now|status|next|drill\b.*)$/i

// Called before intent parsing. Returns a reply when the message was a drill
// answer (or SKIP), null to let normal parsing handle it.
export async function answerPendingDrill(db: SupabaseClient, userId: string, text: string, spoken: boolean): Promise<string | null> {
  const t = text.trim()
  if (COMMANDS.test(t.replace(/[.!?]$/, ''))) return null
  const { data: drill } = await db.from('telegram_drills').select('id, question_id, asked_at').eq('user_id', userId)
    .is('answered_at', null).gte('asked_at', new Date(Date.now() - ANSWER_WINDOW_MS).toISOString())
    .order('asked_at', { ascending: false }).limit(1).maybeSingle()
  if (!drill) return null
  const now = new Date().toISOString()
  if (/^skip\.?$/i.test(t)) {
    await db.from('telegram_drills').update({ answered_at: now }).eq('id', drill.id)
    return '⏭️ Skipped. Reply *DRILL* for another.'
  }

  const { seconds, fillers } = speechStats(t)
  const note = spoken
    ? `This answer was spoken and transcribed (~${seconds}s, ${fillers} filler words). Ignore transcription typos; judge it as a spoken answer, and mention delivery (length, structure, fillers) in Fix next if it hurt the answer.`
    : ''
  const { rating, feedback } = await critiqueQuestion(db, userId, drill.question_id, t, note)

  await db.from('telegram_drills').update({ answered_at: now, transcript: t, rating, critique: feedback }).eq('id', drill.id)
  const [{ data: prev }, { data: q }] = await Promise.all([
    db.from('question_progress').select('attempts, last_answer').eq('user_id', userId).eq('question_id', drill.question_id).maybeSingle(),
    db.from('coding_questions').select('category').eq('id', drill.question_id).single(),
  ])
  await db.from('question_progress').upsert({
    user_id: userId, question_id: drill.question_id,
    attempts: (prev?.attempts ?? 0) + 1, last_answer: t || prev?.last_answer || null, last_seen_at: now,
    ...(rating !== null ? { last_rating: rating, last_rated_at: now } : {}),
  }, { onConflict: 'user_id,question_id' })
  if (q) await syncBankBlocks(db, userId, [q.category])

  return `*Rating ${rating ?? '—'}/10* · ~${seconds}s · ${fillers} filler${fillers === 1 ? '' : 's'}\n\n${feedback}\n\nReply *DRILL* for the next one.`
}
