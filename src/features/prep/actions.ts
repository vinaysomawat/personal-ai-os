'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { todayIST } from '@/lib/date'
import { formatOf, roundScore, type MockFormat, type MockItem, type MockReview, type MockRound } from './mock'
import { COMPETENCIES } from './types'
import type { PrepSession, Story, StoryRehearsal } from './types'
import { endFocus, loadPrepData, startFocus, syncBankBlocks, toggleFocusPause, updateBlocks } from './core'
import type { FocusSession } from './war'

export async function getPrepData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return loadPrepData(supabase, user.id)
}

// ---------------- Focus sessions (War Mode) ----------------

export async function startFocusSession(blockKey: string): Promise<FocusSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const f = await startFocus(supabase, user.id, blockKey)
  revalidatePath('/prep')
  return f
}

export async function toggleFocusSessionPause(id: string): Promise<FocusSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return toggleFocusPause(supabase, user.id, id)
}

export async function endFocusSession(id: string, finished: boolean): Promise<{ focus: FocusSession | null; session: PrepSession | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const res = await endFocus(supabase, user.id, id, finished)
  revalidatePath('/prep')
  revalidatePath('/dashboard')
  return res
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

// Turning Job Hunt Mode on/off (or changing hours) rebuilds today's plan.
export async function savePrepSettings(targetDate: string | null, hoursPerDay: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const hours = Math.min(14, Math.max(1, Math.round(hoursPerDay)))
  const { error } = await supabase.from('prep_settings')
    .upsert({ user_id: user.id, target_date: targetDate, hours_per_day: hours, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  await supabase.from('prep_sessions').delete().eq('user_id', user.id).eq('date', todayIST())
  revalidatePath('/prep')
  revalidatePath('/dashboard')
}

const AI_NATIVE_SYSTEM = `You are a senior engineer interviewing a candidate for a Senior Frontend Engineer role at an AI-native company. The company's bar: engineers don't merely use AI for speed — they form their own hypotheses, pressure-test AI output, catch and explain AI mistakes, verify with evidence (tests, profiling, reading the code, reproducing), and take full ownership of final quality.
Grade one spoken answer against that bar. Reward: a concrete real example (tool, task, what went wrong or right), the candidate's own judgment leading rather than following the AI, explicit verification steps, trade-offs, and honest limits of AI. Penalize: generic "AI makes me faster" claims, no specific example, blind trust, vague verification ("I check it"), buzzwords.
Respond in plain text (no markdown headings), under 200 words, in exactly this shape:
Rating: <integer 1-10> — hiring bar for this level: 9-10 strong hire, 7-8 solid, 5-6 borderline, 3-4 weak, 1-2 no real answer
Verdict: <Strong / Good / Needs work> — <one sentence why>
What worked: <1-2 short points>
Fix next: <2-3 specific, actionable points>
Follow-up they'd ask: <one probing question that pressure-tests this answer>`

const BEHAVIORAL_SYSTEM = `You are a hiring manager interviewing a candidate for a Senior Frontend Engineer / Frontend Tech Lead role. The candidate was recently laid off and is answering a general or fit question.
Grade the spoken answer for: directness (answers the actual question in the first sentence), brevity (60–120 seconds spoken), concrete evidence (specific outcomes, numbers), fit with a senior/lead role, and tone (confident, no blame, no over-explaining — especially about the layoff or salary).
Respond in plain text (no markdown headings), under 180 words, in exactly this shape:
Rating: <integer 1-10> — hiring bar for this level: 9-10 strong hire, 7-8 solid, 5-6 borderline, 3-4 weak, 1-2 no real answer
Verdict: <Strong / Good / Needs work> — <one sentence why>
What worked: <1-2 short points>
Fix next: <2-3 specific, actionable points>
Follow-up they'd ask: <one natural follow-up question>`

const TECHNICAL_SYSTEM = `You are a senior frontend interviewer at a top product company. The candidate answered a frontend theory, UI-coding design, or frontend system-design question out loud and typed their answer.
Grade for technical correctness first (call out anything wrong), then depth (the why, not just the what), trade-offs, and what a senior candidate would add (performance, accessibility, testing, edge cases). If the question lists key points, check which are missing.
Respond in plain text (no markdown headings), under 200 words, in exactly this shape:
Rating: <integer 1-10> — hiring bar for this level: 9-10 strong hire, 7-8 solid, 5-6 borderline, 3-4 weak, 1-2 no real answer
Verdict: <Strong / Good / Needs work> — <one sentence why>
Correct / missing: <what was right, what was wrong or missing>
Fix next: <2-3 specific points to add>
Follow-up they'd ask: <one probing follow-up question>`

// AI interviewer feedback on a typed Question Bank answer (reviewing the
// user's own work — uncached, every answer differs), with a 1–10 rating
// parsed off its first line. The rubric depends on the category. Not
// stored; the answer itself is saved when you hit Next.
export async function critiqueAnswer(questionId: string, answer: string): Promise<{ rating: number | null; feedback: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: q } = await supabase.from('coding_questions').select('title, answer_hints, category').eq('id', questionId).single()
  if (!q) throw new Error('Question not found')
  const hints = q.answer_hints ? `\nKey points a strong answer covers: ${q.answer_hints}` : ''
  const prompt = `Interview question: ${q.title}${hints}\n\nCandidate's answer:\n${answer}`
  const raw = q.category === 'ai-native'
    ? await askAI('ai_native_critique', prompt, AI_NATIVE_SYSTEM, { userId: user.id })
    : await askAI('answer_critique', prompt, q.category === 'behavioral' ? BEHAVIORAL_SYSTEM : TECHNICAL_SYSTEM, { userId: user.id })
  const m = raw.match(/^\s*Rating:\s*(\d{1,2})(?:\s*\/\s*10)?[^\n]*\n?/i)
  const n = m ? Number(m[1]) : NaN
  return { rating: Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : null, feedback: m ? raw.slice(m[0].length).trim() : raw }
}

// Records a Question Bank answer (the question counts as practiced); the
// matching Job Hunt block auto-completes once today's quota is met.
export async function answerQuestion(questionId: string, answer: string | null, rating: number | null = null): Promise<PrepSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: q }, { data: prev }] = await Promise.all([
    supabase.from('coding_questions').select('id, category').eq('id', questionId).single(),
    supabase.from('question_progress').select('attempts, last_answer').eq('user_id', user.id).eq('question_id', questionId).maybeSingle(),
  ])
  if (!q) throw new Error('Question not found')
  const { error } = await supabase.from('question_progress').upsert({
    user_id: user.id, question_id: questionId, status: null,
    attempts: (prev?.attempts ?? 0) + 1, last_answer: answer || prev?.last_answer || null, last_seen_at: new Date().toISOString(),
    // The AI review's rating, when one was run before Next.
    ...(rating !== null ? { last_rating: rating, last_rated_at: new Date().toISOString() } : {}),
  }, { onConflict: 'user_id,question_id' })
  if (error) throw new Error(error.message)

  const session = await syncBankBlocks(supabase, user.id, [q.category])
  revalidatePath('/prep')
  return session
}

// Saves a finished Mock Round: each answered (not skipped) bank question
// counts as practiced in question_progress, the round goes into mock_rounds,
// and today's mock block auto-completes.
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
      user_id: user.id, question_id: i.question_id!, status: null,
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

  const session = await syncBankBlocks(supabase, user.id, [...new Set(answered.map(i => i.category))], b => b.key === 'mock')
  revalidatePath('/prep')
  revalidatePath('/dashboard')
  return { round: round as MockRound, session }
}

export async function togglePrepBlock(key: string): Promise<PrepSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const session = await updateBlocks(supabase, user.id, todayIST(), blocks => blocks.map(b => b.key === key ? { ...b, done: !b.done } : b))
  revalidatePath('/prep')
  revalidatePath('/dashboard')
  return session
}

const MOCK_REVIEW_SYSTEM = `You are a senior frontend interviewer (Senior Frontend Engineer / Frontend Tech Lead loop, at a company that expects AI-native engineers) reviewing a candidate's whole mock interview round at once.
For each question judge the typed answer by its kind: theory / UI coding / system design — technical correctness first (call out anything wrong), then depth, trade-offs and missing key points; behavioral / STAR — directness, structure (situation, what THEY did, measurable result), evidence and tone; AI-native — their own judgment and verification of AI output, a concrete example, honest limits. Use the listed key points as the rubric. Note answers that ran far over their time budget.
Rate every judged answer 1-10 as a hiring bar for this level: 9-10 = strong hire answer, 7-8 = solid, 5-6 = borderline (gaps or shallow), 3-4 = weak (wrong or missing key points), 1-2 = no real answer. Use null for answers you can't judge (skipped, or given out loud and not typed).
If an answer is marked as given out loud (not typed), say you can't judge it and suggest typing the gist next time. If it is marked skipped, say what a strong answer would have covered in one line.
Respond with ONLY a JSON object, no prose before or after:
{"verdict":"Strong" | "Good" | "Needs work","outcome":"Likely pass" | "Borderline" | "Likely no","summary":"2 sentences on the round overall","strengths":["up to 2 short points"],"fixes":["up to 3 specific, actionable fixes, most important first"],"ratings":[one integer 1-10 or null per question, in order],"notes":["one note per question, in order, each 1-3 sentences"]}`

const parseList = (v: unknown) => Array.isArray(v) ? v.map(String).filter(Boolean) : []

// One AI review for a whole saved round (all answers in a single call, Haiku,
// uncached), stored on the row so the calendar can show it again for free.
export async function reviewMockRound(roundId: string): Promise<{ review: MockReview | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: round } = await supabase.from('mock_rounds').select('format, items, review').eq('id', roundId).eq('user_id', user.id).single()
  if (!round) throw new Error('Round not found')
  if (round.review) return { review: round.review as MockReview, error: null }

  const items = round.items as MockItem[]
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const prompt = `Round: ${formatOf(round.format).label}, ${items.length} questions.\n\n` + items.map((it, i) => [
    `Q${i + 1} [${it.category === 'star' ? 'STAR story' : it.category}] ${it.prompt}`,
    it.hints ? `Key points: ${it.hints}` : null,
    `Time: ${mm(it.seconds)} of ${mm(it.budget_seconds)}`,
    `Answer: ${it.skipped ? '[skipped]' : it.answer.trim() || '[answered out loud — not typed]'}`,
  ].filter(Boolean).join('\n')).join('\n\n')

  const raw = await askAI('mock_round_review', prompt, MOCK_REVIEW_SYSTEM, { userId: user.id })
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(json) } catch { return { review: null, error: raw.startsWith('{') ? 'The review came back malformed — try again.' : raw } }
  const rawRatings = Array.isArray(parsed.ratings) ? parsed.ratings : []
  // Clamp to 1–10; skipped / untyped answers are never rated, whatever the AI says.
  const ratings = items.map((it, i) => {
    const n = Number(rawRatings[i])
    return it.skipped || !it.answer.trim() || !Number.isFinite(n) || rawRatings[i] === null ? null : Math.min(10, Math.max(1, Math.round(n)))
  })
  const review: MockReview = {
    verdict: String(parsed.verdict ?? ''), outcome: String(parsed.outcome ?? ''), summary: String(parsed.summary ?? ''),
    strengths: parseList(parsed.strengths), fixes: parseList(parsed.fixes),
    notes: items.map((_, i) => parseList(parsed.notes)[i] ?? ''),
    ratings, score: roundScore(ratings),
  }
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

const CRITIQUE_SYSTEM = `You are a senior engineering manager interviewing a candidate for a Frontend Tech Lead / Senior UI Engineer role, giving candid coaching on one behavioral answer.
Assess against: STAR structure (clear situation, their specific actions, a concrete result), specificity and numbers, "I" vs "we" (their own contribution must be clear), leadership signal (influence, judgment, trade-offs, growing others), and length (a spoken answer should be ~2 minutes).
Respond in plain text (no markdown headings), under 180 words, in exactly this shape:
Verdict: <Strong / Good / Needs work> — <one sentence why>
What worked: <1-2 short points>
Fix next: <2-3 specific, actionable points>
Follow-up they'd ask: <one probing question an interviewer would likely ask next>`

export async function rehearseStory(competency: string, prompt: string, answer: string, storyId: string | null): Promise<StoryRehearsal> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const label = COMPETENCIES.find(c => c.key === competency)?.label ?? competency
  const critique = await askAI('story_critique', `Competency being assessed: ${label}\nInterview question: ${prompt}\n\nCandidate's answer:\n${answer}`, CRITIQUE_SYSTEM, { userId: user.id })
  const { data, error } = await supabase.from('story_rehearsals')
    .insert({ user_id: user.id, story_id: storyId, competency, prompt, answer, critique })
    .select('id, story_id, competency, prompt, answer, critique, created_at').single()
  if (error) throw new Error(error.message)
  if (storyId) await supabase.from('stories').update({ last_rehearsed_at: new Date().toISOString() }).eq('id', storyId)
  revalidatePath('/prep')
  return data as StoryRehearsal
}
