'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { todayIST } from '@/lib/date'
import { formatOf, roundScore, type MockFormat, type MockItem, type MockReview, type MockRound } from './mock'
import { COMPETENCIES } from './types'
import type { PrepSession, Story, StoryRehearsal } from './types'
import { loadPrepData, updateBlocks } from './core'
import { abandonFight, answerFight, markFixRead, startFight } from './fight'
import type { Fight } from './boss'
import type { ReadinessAreaKey } from './types'
import { critiqueFollowUp, critiqueQuestion, critiqueStory, modelAnswer, SPOKEN_NOTE } from './critique'
import type { Rubric, Scorecard } from './scorecard'
import { speechStats } from '@/lib/speech-stats'

export async function getPrepData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return loadPrepData(supabase, user.id)
}

// ---------------- Boss Ladder fights ----------------

async function signedIn() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

export async function startFightAction(area: ReadinessAreaKey): Promise<{ fight: Fight | null; error: string | null }> {
  const { supabase, userId } = await signedIn()
  return startFight(supabase, userId, area, 'web')
}

// The last answer grades the whole fight (one critique per answer, in parallel).
export async function answerFightAction(id: string, answer: string, spoken: boolean, seconds: number): Promise<Fight | null> {
  const { supabase, userId } = await signedIn()
  const f = await answerFight(supabase, userId, id, answer, { spoken, seconds })
  if (f && f.status !== 'active') { revalidatePath('/prep'); revalidatePath('/dashboard') }
  return f
}

export async function abandonFightAction(id: string): Promise<Fight | null> {
  const { supabase, userId } = await signedIn()
  return abandonFight(supabase, userId, id)
}

export async function markFixReadAction(id: string): Promise<Fight | null> {
  const { supabase, userId } = await signedIn()
  const f = await markFixRead(supabase, userId, id)
  revalidatePath('/prep')
  return f
}

// The Boss Ladder deadline ("N days to …"); null clears it.
export async function savePrepTargetDate(date: string | null) {
  const { supabase, userId } = await signedIn()
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date')
  const { error } = await supabase.from('prep_settings').upsert({ user_id: userId, target_date: date, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
}

// Weekly "if you interviewed tomorrow" forecast, on demand (the Sunday
// evening coach cron also generates one).
export async function generatePrepForecast() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { generateForecast } = await import('./forecast')
  const res = await generateForecast(supabase, user.id)
  revalidatePath('/prep')
  return res
}

// Changing the daily load level (or the outreach target) rebuilds today's plan.
export async function savePrepSettings(hoursPerDay: number, weeklyOutreachTarget = 25) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const hours = Math.min(14, Math.max(1, Math.round(hoursPerDay)))
  const { error } = await supabase.from('prep_settings')
    .upsert({ user_id: user.id, hours_per_day: hours, weekly_outreach_target: Math.min(200, Math.max(1, Math.round(weeklyOutreachTarget))), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  await supabase.from('prep_sessions').delete().eq('user_id', user.id).eq('date', todayIST())
  revalidatePath('/prep')
  revalidatePath('/dashboard')
}

// AI interviewer feedback on a typed Question Bank answer (reviewing the
// user's own work — uncached, every answer differs): a scorecard whose 1–10
// rating is computed in code (critique.ts). The rubric depends on the
// category; `spoken` = dictated via Speak. Not stored; the answer and rating
// are saved when you hit Next.
export async function critiqueAnswer(questionId: string, answer: string, spoken = false): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { seconds, fillers } = speechStats(answer)
  return critiqueQuestion(supabase, user.id, questionId, answer, spoken ? SPOKEN_NOTE(seconds, fillers) : '')
}

// Model answer for a Question Bank question (the "Answer" button) — cached a
// year per question by the gateway.
export async function revealModelAnswer(questionId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return modelAnswer(supabase, user.id, questionId)
}

// Grades the user's answer to a review's follow-up question. Practice only —
// nothing is stored and the original question's rating is untouched.
export async function critiqueFollowUpAnswer(rubric: Rubric, original: string, followUp: string, answer: string, spoken = false): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { seconds, fillers } = speechStats(answer)
  return critiqueFollowUp(user.id, rubric, original, followUp, answer, spoken ? SPOKEN_NOTE(seconds, fillers) : '')
}

// Records a Question Bank answer (the question counts as practiced).
export async function answerQuestion(questionId: string, answer: string | null, rating: number | null = null): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: q }, { data: prev }] = await Promise.all([
    supabase.from('coding_questions').select('id').eq('id', questionId).single(),
    supabase.from('question_progress').select('attempts, last_answer').eq('user_id', user.id).eq('question_id', questionId).maybeSingle(),
  ])
  if (!q) throw new Error('Question not found')
  const { error } = await supabase.from('question_progress').upsert({
    user_id: user.id, question_id: questionId,
    attempts: (prev?.attempts ?? 0) + 1, last_answer: answer || prev?.last_answer || null, last_seen_at: new Date().toISOString(),
    // The AI review's rating, when one was run before Next.
    ...(rating !== null ? { last_rating: rating, last_rated_at: new Date().toISOString() } : {}),
  }, { onConflict: 'user_id,question_id' })
  if (error) throw new Error(error.message)

  revalidatePath('/prep')
}

// Saves a finished Mock Round: each answered (not skipped) bank question
// counts as practiced in question_progress, the round goes into mock_rounds,
// and today's mock block of that format auto-completes.
export async function saveMockRound(format: MockFormat, items: MockItem[], durationSeconds: number): Promise<{ round: MockRound; session: PrepSession | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (items.length === 0) throw new Error('Empty round')
  const now = new Date().toISOString()

  const answered = items.filter(i => i.question_id && !i.skipped)
  if (answered.length > 0) {
    const ids = answered.map(i => i.question_id!)
    const { data: prev } = await supabase.from('question_progress').select('question_id, attempts, last_answer').eq('user_id', user.id).in('question_id', ids)
    const prevById = new Map((prev ?? []).map(p => [p.question_id, p]))
    const { error } = await supabase.from('question_progress').upsert(answered.map(i => ({
      user_id: user.id, question_id: i.question_id!,
      attempts: (prevById.get(i.question_id!)?.attempts ?? 0) + 1,
      // An answer given out loud (blank here) keeps the last typed one.
      last_answer: i.answer.trim() || prevById.get(i.question_id!)?.last_answer || null,
      last_seen_at: now,
    })), { onConflict: 'user_id,question_id' })
    if (error) throw new Error(error.message)
  }

  const { data: round, error } = await supabase.from('mock_rounds')
    .insert({ user_id: user.id, format, items, duration_seconds: Math.max(0, Math.round(durationSeconds)) })
    .select('id, format, items, duration_seconds, created_at, review').single()
  if (error) throw new Error(error.message)

  const session = await updateBlocks(supabase, user.id, todayIST(), blocks => blocks.map(b => b.key === `mock:${format}` ? { ...b, done: true } : b))
  revalidatePath('/prep')
  revalidatePath('/dashboard')
  return { round: round as MockRound, session }
}

const MOCK_REVIEW_SYSTEM = `You are a senior frontend interviewer (Senior Frontend Engineer / Frontend Tech Lead loop, at a company that expects AI-native engineers) reviewing a candidate's whole mock interview round at once.
For each question judge the typed answer by its kind: theory / UI coding / system design — technical correctness first (call out anything wrong), then depth, trade-offs and missing key points; behavioral / STAR — directness, structure (situation, what THEY did, measurable result), evidence and tone; AI-native — their own judgment and verification of AI output, a concrete example, honest limits. Use the listed key points as the rubric. Note answers that ran far over their time budget.
Rate every judged answer 1-10 as a hiring bar for this level: 9-10 = strong hire answer, 7-8 = solid, 5-6 = borderline (gaps or shallow), 3-4 = weak (wrong or missing key points), 1-2 = no real answer. Use null for answers you can't judge (skipped, or given out loud and not typed).
If an answer is marked as given out loud (not typed), say you can't judge it and suggest typing the gist next time. If it is marked skipped, say what a strong answer would have covered in one line.
Respond with ONLY a JSON object, no prose before or after:
{"verdict":"Strong" | "Good" | "Needs work","outcome":"Likely pass" | "Borderline" | "Likely no","summary":"2 sentences on the round overall","strengths":["up to 2 short points"],"fixes":["up to 3 specific, actionable fixes, most important first"],"ratings":[one integer 1-10 or null per question, in order],"notes":["one note per question, in order, each 1-3 sentences"]}`

const parseList = (v: unknown) => Array.isArray(v) ? v.map(String).filter(Boolean) : []

// The AI review of a saved round, stored on the row so the calendar can show
// it again for free: one Haiku call for the whole round, or (code-review and
// code-review) one scorecard per answer.
export async function reviewMockRound(roundId: string): Promise<{ review: MockReview | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: round } = await supabase.from('mock_rounds').select('format, items, review').eq('id', roundId).eq('user_id', user.id).single()
  if (!round) throw new Error('Round not found')
  if (round.review) return { review: round.review as MockReview, error: null }

  const items = round.items as MockItem[]
  const review = SCORECARD_FORMATS.has(round.format)
    ? await scorecardRoundReview(supabase, user.id, items)
    : await wholeRoundReview(user.id, round.format, items)
  if (typeof review === 'string') return { review: null, error: review }
  const { ratings } = review
  const { error } = await supabase.from('mock_rounds').update({ review }).eq('id', roundId)
  if (error) throw new Error(error.message)
  // Each rated bank answer's rating also lands on its question, so topic
  // weakness and readiness see mock performance.
  const ratedAt = new Date().toISOString()
  await Promise.all(items.map((it, i) => it.question_id && ratings[i] !== null
    ? supabase.from('question_progress').update({ last_rating: ratings[i], last_rated_at: ratedAt }).eq('user_id', user.id).eq('question_id', it.question_id)
    : null))
  revalidatePath('/prep')
  return { review, error: null }
}

// Code-review rounds are graded answer by answer with the shared scorecard
// (their key points are the planted issues), and
// the round's verdict is derived from the computed ratings.
const SCORECARD_FORMATS = new Set(['code-review'])

async function scorecardRoundReview(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, items: MockItem[]): Promise<MockReview | string> {
  const graded = await Promise.all(items.map(it => it.question_id && !it.skipped && it.answer.trim() ? critiqueQuestion(supabase, userId, it.question_id, it.answer.trim()) : null))
  if (graded.every(g => g === null)) return 'Nothing typed to review — type your answers next time.'
  const cards = graded.map(g => g?.card ?? null)
  const ratings = graded.map(g => g?.rating ?? null)
  const score = roundScore(ratings)
  const got = cards.filter((c): c is Scorecard => c !== null)
  return {
    verdict: score === null ? 'Needs work' : score >= 8 ? 'Strong' : score >= 6 ? 'Good' : 'Needs work',
    outcome: score === null ? 'Borderline' : score >= 7 ? 'Likely pass' : score >= 5 ? 'Borderline' : 'Likely no',
    summary: got.map(c => c.summary).join(' '),
    strengths: got.flatMap(c => c.points.filter(p => p.status === 'covered').map(p => p.point)).slice(0, 2),
    fixes: got.flatMap(c => c.fixes).slice(0, 3),
    notes: graded.map((g, i) => g ? (g.card ? `${g.card.verdict} — ${g.card.summary}` : g.feedback) : items[i].skipped ? 'Skipped.' : 'Not typed — can\'t be graded.'),
    ratings, score, cards,
  }
}

// Every other format: one Haiku call reviews the whole round.
async function wholeRoundReview(userId: string, format: string, items: MockItem[]): Promise<MockReview | string> {
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const prompt = `Round: ${formatOf(format).label}, ${items.length} questions.\n\n` + items.map((it, i) => [
    `Q${i + 1} [${it.category === 'star' ? 'STAR story' : it.category}] ${it.prompt}`,
    it.hints ? `Key points: ${it.hints}` : null,
    `Time: ${mm(it.seconds)} of ${mm(it.budget_seconds)}`,
    `Answer: ${it.skipped ? '[skipped]' : it.answer.trim() || '[answered out loud — not typed]'}`,
  ].filter(Boolean).join('\n')).join('\n\n')

  const raw = await askAI('mock_round_review', prompt, MOCK_REVIEW_SYSTEM, { userId })
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(json) } catch { return raw.startsWith('{') ? 'The review came back malformed — try again.' : raw }
  const rawRatings = Array.isArray(parsed.ratings) ? parsed.ratings : []
  // Clamp to 1–10; skipped / untyped answers are never rated, whatever the AI says.
  const ratings = items.map((it, i) => {
    const n = Number(rawRatings[i])
    return it.skipped || !it.answer.trim() || !Number.isFinite(n) || rawRatings[i] === null ? null : Math.min(10, Math.max(1, Math.round(n)))
  })
  return {
    verdict: String(parsed.verdict ?? ''), outcome: String(parsed.outcome ?? ''), summary: String(parsed.summary ?? ''),
    strengths: parseList(parsed.strengths), fixes: parseList(parsed.fixes),
    notes: items.map((_, i) => parseList(parsed.notes)[i] ?? ''),
    ratings, score: roundScore(ratings),
  }
}

export type StoryInput = Pick<Story, 'title' | 'competencies' | 'situation' | 'task' | 'action' | 'result' | 'metrics' | 'strength'>

export async function saveStory(id: string | null, input: StoryInput): Promise<Story> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const row = { ...input, updated_at: new Date().toISOString() }
  const { data, error } = id
    ? await supabase.from('stories').update(row).eq('id', id).select('*').single()
    : await supabase.from('stories').insert({ ...row, user_id: user.id }).select('*').single()
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
  return data as Story
}

export async function deleteStory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
}

// Story Bank rehearsal: graded with the shared scorecard (critique.ts,
// `story` rubric) and stored with its computed rating.
export async function rehearseStory(competency: string, prompt: string, answer: string, storyId: string | null, spoken = false): Promise<StoryRehearsal> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const label = COMPETENCIES.find(c => c.key === competency)?.label ?? competency
  const { seconds, fillers } = speechStats(answer)
  const { rating, feedback, card } = await critiqueStory(user.id, label, prompt, answer, spoken ? SPOKEN_NOTE(seconds, fillers) : '')
  const { data, error } = await supabase.from('story_rehearsals')
    .insert({ user_id: user.id, story_id: storyId, competency, prompt, answer, critique: feedback, rating, scorecard: card })
    .select('id, story_id, competency, prompt, answer, critique, rating, scorecard, created_at').single()
  if (error) throw new Error(error.message)
  if (storyId) await supabase.from('stories').update({ last_rehearsed_at: new Date().toISOString() }).eq('id', storyId)
  revalidatePath('/prep')
  return data as StoryRehearsal
}
