'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { todayIST, daysAgoIST, toISTDateStr, istMidnightUtc } from '@/lib/date'
import { getTodayAssignmentRows } from '@/features/coding/daily-core'
import { getActiveDailyRead } from '@/features/learning/daily-read'
import type { QuizAttempt } from '@/features/career/types'
import { formatOf, roundScore, type MockFormat, type MockItem, type MockReview, type MockRound } from './mock'
import { buildPrepPlan } from './plan'
import { BANK_CATEGORIES, buildHuntPlan, computeQuotas, daysLeft, type CategoryCoverage } from './hunt'
import { computeReadinessMatrix, weakestAreas, type CodingHistoryRow } from './readiness'
import { COMPETENCIES, READINESS_AREAS } from './types'
import type { BankQuestion, PrepBlock, PrepSession, PrepSettings, Story, StoryRehearsal } from './types'

function prepStreak(sessions: { date: string; completed_at: string | null }[], today: string): number {
  const done = new Set(sessions.filter(s => s.completed_at).map(s => s.date))
  let streak = 0
  const cursor = new Date(`${today}T00:00:00Z`)
  for (let i = 0; i < 3650; i++) {
    const d = cursor.toISOString().slice(0, 10)
    if (done.has(d)) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1) }
    else if (i === 0) cursor.setUTCDate(cursor.getUTCDate() - 1)
    else break
  }
  return streak
}

export async function getPrepData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const today = todayIST()

  const [mockRes, storiesRes, rehearsalsRes, quizRes, codingRes, activePicks, resourcesRes, sessionsRes] = await Promise.all([
    supabase.from('mock_rounds').select('id, format, items, duration_seconds, created_at, review').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    supabase.from('stories').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('story_rehearsals').select('id, story_id, competency, prompt, answer, critique, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('quiz_attempts').select('*').eq('user_id', user.id),
    supabase.from('coding_daily_questions').select('completed, outcome, completed_at, question:coding_questions(category, topics)').eq('user_id', user.id).eq('completed', true).gte('completed_at', istMidnightUtc(90)),
    getTodayAssignmentRows(supabase, user.id),
    supabase.from('resources').select('id, title, notes, created_at, status').eq('user_id', user.id),
    supabase.from('prep_sessions').select('*').eq('user_id', user.id).gte('date', daysAgoIST(60)).order('date', { ascending: false }),
  ])
  const [settings, bank] = await Promise.all([getPrepSettings(supabase, user.id), getQuestionBank(supabase, user.id)])
  const days = settings.target_date ? daysLeft(today, settings.target_date) : null
  const coverage = bankCoverage(bank, today)
  const quotas = days !== null ? computeQuotas(coverage, settings.hours_per_day, days) : null

  const stories = (storiesRes.data ?? []) as Story[]
  const quizAttempts = (quizRes.data ?? []) as QuizAttempt[]
  const readiness = computeReadinessMatrix(quizAttempts, (codingRes.data ?? []) as unknown as CodingHistoryRow[], stories, coverage.find(c => c.key === 'ai-native') ?? null)

  let sessions = (sessionsRes.data ?? []) as PrepSession[]
  let todaySession = sessions.find(s => s.date === today) ?? null
  if (!todaySession) {
    // Weakest area that maps to a quiz topic — drives the quiz-based blocks.
    const weakQuizArea = weakestAreas(readiness, READINESS_AREAS.length)
      .map(c => READINESS_AREAS.find(a => a.key === c.key)!)
      .find(a => a.quizTopics.length > 0)
    const covered = new Set(stories.filter(s => (s.strength ?? 3) >= 3).flatMap(s => s.competencies))
    const uncovered = COMPETENCIES.find(c => !covered.has(c.key))
    const activeRead = getActiveDailyRead((resourcesRes.data ?? []) as { title: string; notes: string | null; created_at: string; status: 'not-started' | 'in-progress' | 'completed' }[])
    const plan = quotas && days !== null ? buildHuntPlan({
      hoursPerDay: settings.hours_per_day, days, date: today, quotas,
      uncoveredCompetency: uncovered?.label ?? null,
    }) : buildPrepPlan(today, {
      weakestTopic: weakQuizArea ? { area: weakQuizArea.label, topic: (weakQuizArea.quizTopics as readonly string[])[0] } : null,
      activeRead: activeRead && activeRead.status !== 'completed' ? { title: activeRead.title } : null,
      uncoveredCompetency: uncovered?.label ?? null,
      codingPicks: activePicks.filter(p => !p.completed).map(p => ({ category: p.question.category, title: p.question.title })),
    })
    const { data: inserted } = await supabase.from('prep_sessions')
      .upsert({ user_id: user.id, date: today, focus: plan.focus, blocks: plan.blocks }, { onConflict: 'user_id,date', ignoreDuplicates: true })
      .select('*')
    todaySession = ((inserted ?? [])[0] as PrepSession | undefined) ?? null
    if (!todaySession) {
      const { data } = await supabase.from('prep_sessions').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
      todaySession = (data as PrepSession | null) ?? null
    }
    if (todaySession) sessions = [todaySession, ...sessions]
  }

  return {
    today,
    session: todaySession,
    streak: prepStreak(sessions, today),
    sessionsLast7: sessions.filter(s => s.date >= daysAgoIST(6) && s.completed_at).length,
    // Empty (not an error) until the mock_rounds migration has run.
    mockRounds: (mockRes.data ?? []) as MockRound[],
    stories,
    rehearsals: (rehearsalsRes.data ?? []) as StoryRehearsal[],
    readiness,
    settings,
    daysLeft: days,
    coverage: quotas ?? coverage,
    bank,
  }
}

async function getPrepSettings(supabase: SupabaseClient, userId: string): Promise<PrepSettings> {
  const { data } = await supabase.from('prep_settings').select('target_date, hours_per_day').eq('user_id', userId).maybeSingle()
  return { target_date: data?.target_date ?? null, hours_per_day: data?.hours_per_day ?? 8 }
}

// PostgREST caps a response at 1,000 rows, and the bank is past that —
// page through it so no category gets silently truncated.
async function fetchAllQuestions(supabase: SupabaseClient) {
  const PAGE = 1000
  const rows: { id: string; title: string; difficulty: string; url: string | null; category: string; topics: string[] | null; sort_order: number | null; answer_hints: string | null }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('coding_questions')
      .select('id, title, difficulty, url, category, topics, sort_order, answer_hints').order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

async function getQuestionBank(supabase: SupabaseClient, userId: string): Promise<BankQuestion[]> {
  const [questions, { data: progress }, { data: coding }] = await Promise.all([
    fetchAllQuestions(supabase),
    supabase.from('question_progress').select('question_id, last_seen_at, last_answer').eq('user_id', userId),
    supabase.from('coding_daily_questions').select('question_id, completed_at').eq('user_id', userId).eq('completed', true),
  ])
  // Last practiced = the newer of a Question Bank / Mock Round answer and a
  // completed Coding pick, so Coding work counts as covered.
  const lastSeen = new Map<string, string>()
  const answers = new Map<string, string | null>()
  const touch = (id: string, at: string) => { if ((lastSeen.get(id) ?? '') < at) lastSeen.set(id, at) }
  for (const c of coding ?? []) if (c.completed_at) touch(c.question_id, c.completed_at)
  for (const p of progress ?? []) { touch(p.question_id, p.last_seen_at); answers.set(p.question_id, p.last_answer) }
  return questions.map(q => ({
    ...q, topics: q.topics ?? [],
    last_seen_at: lastSeen.get(q.id) ?? null,
    last_answer: answers.get(q.id) ?? null,
  }))
}

function bankCoverage(bank: BankQuestion[], today: string): CategoryCoverage[] {
  return BANK_CATEGORIES.map(cat => {
    const qs = bank.filter(q => q.category === cat.key)
    return {
      key: cat.key, label: cat.label, total: qs.length,
      seen: qs.filter(q => q.last_seen_at).length,
      doneToday: qs.filter(q => q.last_seen_at && toISTDateStr(q.last_seen_at) === today).length,
    }
  })
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
export async function answerQuestion(questionId: string, answer: string | null): Promise<PrepSession | null> {
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
  }, { onConflict: 'user_id,question_id' })
  if (error) throw new Error(error.message)

  const session = await syncBankBlocks(supabase, user.id, [q.category])
  revalidatePath('/prep')
  return session
}

// Ticks Job Hunt bank blocks whose quota (the label's "× N") today's practiced
// count in that category has reached. `extra` lets a caller tick more blocks
// in the same write.
async function syncBankBlocks(supabase: SupabaseClient, userId: string, categories: string[], extra: (b: PrepBlock) => boolean = () => false): Promise<PrepSession | null> {
  const counts = new Map<string, number>()
  if (categories.length > 0) {
    const { data } = await supabase.from('question_progress')
      .select('question_id, coding_questions!inner(category)').eq('user_id', userId)
      .in('coding_questions.category', categories).gte('last_seen_at', istMidnightUtc())
    for (const row of (data ?? []) as unknown as { coding_questions: { category: string } }[]) {
      counts.set(row.coding_questions.category, (counts.get(row.coding_questions.category) ?? 0) + 1)
    }
  }
  return updateBlocks(supabase, userId, todayIST(), blocks => blocks.map(b => {
    if (extra(b)) return { ...b, done: true }
    const cat = b.key.startsWith('bank:') ? b.key.slice(5) : null
    if (!cat || !categories.includes(cat)) return b
    const quota = Number(b.label.match(/× (\d+)$/)?.[1] ?? 0)
    return quota > 0 && (counts.get(cat) ?? 0) >= quota ? { ...b, done: true } : b
  }))
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

async function updateBlocks(supabase: SupabaseClient, userId: string, date: string, fn: (blocks: PrepBlock[]) => PrepBlock[]): Promise<PrepSession | null> {
  const { data } = await supabase.from('prep_sessions').select('*').eq('user_id', userId).eq('date', date).maybeSingle()
  if (!data) return null
  const blocks = fn(data.blocks as PrepBlock[])
  const allDone = blocks.length > 0 && blocks.every(b => b.done)
  const { data: updated } = await supabase.from('prep_sessions')
    .update({ blocks, completed_at: allDone ? (data.completed_at ?? new Date().toISOString()) : null })
    .eq('id', data.id).select('*').single()
  return (updated as PrepSession | null) ?? null
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
