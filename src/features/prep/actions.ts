'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { todayIST, daysAgoIST, toISTDateStr, istMidnightUtc } from '@/lib/date'
import { getTodayAssignmentRows } from '@/features/coding/daily-core'
import { getActiveDailyRead } from '@/features/learning/daily-read'
import type { QuizAttempt, QuizQuestion } from '@/features/career/types'
import { scheduleReview } from './srs'
import { buildPrepPlan } from './plan'
import { BANK_CATEGORIES, buildHuntPlan, computeQuotas, daysLeft, type BankCategory, type CategoryCoverage } from './hunt'
import { computeReadinessMatrix, weakestAreas, type CodingHistoryRow } from './readiness'
import { COMPETENCIES, READINESS_AREAS } from './types'
import type { BankQuestion, Flashcard, PrepBlock, PrepSession, PrepSettings, QuestionStatus, ReviewGrade, Story, StoryRehearsal } from './types'

// Every wrong answer from a graded quiz (Career topic quiz, Learning
// resource quiz) becomes a flashcard — the question, the correct option,
// and the explanation the quiz already stored. Idempotent via the
// (user_id, source_ref) unique key, so it's safe to run on every load.
async function syncQuizFlashcards(supabase: SupabaseClient, userId: string): Promise<void> {
  const [{ data: career }, { data: learning }] = await Promise.all([
    supabase.from('quiz_attempts').select('id, topic, questions, user_answers').eq('user_id', userId),
    supabase.from('resource_quiz_attempts').select('id, category, questions, user_answers').eq('user_id', userId),
  ])
  const rows: Omit<Flashcard, 'id' | 'ease' | 'interval_days' | 'reps' | 'lapses' | 'due_date' | 'last_reviewed_at' | 'created_at'>[] = []
  const collect = (source: 'career_quiz' | 'learning_quiz', attemptId: string, topic: string, questions: QuizQuestion[], answers: number[]) => {
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex || !q.options?.[q.correctIndex]) return
      rows.push({
        user_id: userId, source, topic,
        source_ref: `${source}:${attemptId}:${i}`,
        front: q.question,
        back: `✓ ${q.options[q.correctIndex]}${q.explanation ? `\n\n${q.explanation}` : ''}`,
      })
    })
  }
  for (const a of career ?? []) collect('career_quiz', a.id, a.topic, a.questions ?? [], a.user_answers ?? [])
  for (const a of learning ?? []) collect('learning_quiz', a.id, a.category, a.questions ?? [], a.user_answers ?? [])
  if (rows.length === 0) return
  await supabase.from('flashcards').upsert(rows, { onConflict: 'user_id,source_ref', ignoreDuplicates: true })
}

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

  await syncQuizFlashcards(supabase, user.id)

  const [cardsRes, storiesRes, rehearsalsRes, quizRes, codingRes, activePicks, resourcesRes, sessionsRes] = await Promise.all([
    supabase.from('flashcards').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
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

  const flashcards = (cardsRes.data ?? []) as Flashcard[]
  const stories = (storiesRes.data ?? []) as Story[]
  const quizAttempts = (quizRes.data ?? []) as QuizAttempt[]
  const readiness = computeReadinessMatrix(quizAttempts, (codingRes.data ?? []) as unknown as CodingHistoryRow[], stories, coverage.find(c => c.key === 'ai-native') ?? null)
  const dueCards = flashcards.filter(c => c.due_date <= today)

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
      hoursPerDay: settings.hours_per_day, days, quotas,
      dueCards: dueCards.length, uncoveredCompetency: uncovered?.label ?? null,
    }) : buildPrepPlan(today, {
      dueCards: dueCards.length,
      totalCards: flashcards.length,
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
    flashcards,
    dueCount: dueCards.length,
    reviewedToday: flashcards.filter(c => c.last_reviewed_at && toISTDateStr(c.last_reviewed_at) === today).length,
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

// Coding pick outcome → the same self-grade scale the Question Bank uses, so
// questions already practiced in the Coding module count as covered.
const OUTCOME_STATUS: Record<string, QuestionStatus> = { solved: 'confident', solved_with_help: 'partial', struggled: 'missed' }

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
    supabase.from('question_progress').select('question_id, status, last_seen_at, last_answer').eq('user_id', userId),
    supabase.from('coding_daily_questions').select('question_id, outcome, completed_at').eq('user_id', userId).eq('completed', true),
  ])
  const seen = new Map<string, { status: QuestionStatus; last_seen_at: string; last_answer?: string | null }>()
  for (const c of coding ?? []) {
    if (!c.completed_at) continue
    const prev = seen.get(c.question_id)
    if (prev && prev.last_seen_at >= c.completed_at) continue
    seen.set(c.question_id, { status: OUTCOME_STATUS[c.outcome ?? ''] ?? 'partial', last_seen_at: c.completed_at })
  }
  // An explicit Question Bank grade wins over a derived one when it's newer.
  for (const p of progress ?? []) {
    const prev = seen.get(p.question_id)
    if (!prev || p.last_seen_at >= prev.last_seen_at) seen.set(p.question_id, { status: p.status as QuestionStatus, last_seen_at: p.last_seen_at, last_answer: p.last_answer })
  }
  return questions.map(q => ({
    ...q, topics: q.topics ?? [],
    status: seen.get(q.id)?.status ?? null,
    last_seen_at: seen.get(q.id)?.last_seen_at ?? null,
    last_answer: seen.get(q.id)?.last_answer ?? null,
  }))
}

function bankCoverage(bank: BankQuestion[], today: string): CategoryCoverage[] {
  return BANK_CATEGORIES.map(cat => {
    const qs = bank.filter(q => q.category === cat.key)
    return {
      key: cat.key, label: cat.label, total: qs.length,
      seen: qs.filter(q => q.status).length,
      confident: qs.filter(q => q.status === 'confident').length,
      review: qs.filter(q => q.status === 'partial' || q.status === 'missed').length,
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
Verdict: <Strong / Good / Needs work> — <one sentence why>
What worked: <1-2 short points>
Fix next: <2-3 specific, actionable points>
Follow-up they'd ask: <one probing question that pressure-tests this answer>`

// AI interviewer feedback on an AI-native answer (reviewing the user's own
// work — uncached, every answer differs). Feedback isn't stored; the
// answer itself is saved when the question is graded.
export async function critiqueAnswer(questionId: string, answer: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: q } = await supabase.from('coding_questions').select('title, answer_hints').eq('id', questionId).single()
  if (!q) throw new Error('Question not found')
  const hints = q.answer_hints ? `\nAreas a strong answer covers: ${q.answer_hints}` : ''
  return askAI('ai_native_critique', `Interview question: ${q.title}${hints}\n\nCandidate's answer:\n${answer}`, AI_NATIVE_SYSTEM, { userId: user.id })
}

// Self-grade one Question Bank question. Partial/missed ones become a
// flashcard (front = question, back = your answer + reference link), and the
// matching Job Hunt block auto-completes once today's quota is met.
export async function gradeQuestion(questionId: string, status: QuestionStatus, answer: string | null): Promise<PrepSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const today = todayIST()
  const now = new Date().toISOString()

  const [{ data: q }, { data: prev }] = await Promise.all([
    supabase.from('coding_questions').select('id, title, url, category, topics').eq('id', questionId).single(),
    supabase.from('question_progress').select('attempts').eq('user_id', user.id).eq('question_id', questionId).maybeSingle(),
  ])
  if (!q) throw new Error('Question not found')
  const { error } = await supabase.from('question_progress').upsert({
    user_id: user.id, question_id: questionId, status,
    attempts: (prev?.attempts ?? 0) + 1, last_answer: answer || null, last_seen_at: now,
  }, { onConflict: 'user_id,question_id' })
  if (error) throw new Error(error.message)

  if (status !== 'confident') {
    const back = [answer ? `Your answer: ${answer}` : null, q.url ? `Reference: ${q.url}` : null].filter(Boolean).join('\n\n') || 'Look this one up again.'
    await supabase.from('flashcards').upsert({
      user_id: user.id, source: 'question_bank', source_ref: `question_bank:${questionId}`,
      front: q.title, back, topic: q.topics?.[0] ?? null, due_date: today,
    }, { onConflict: 'user_id,source_ref', ignoreDuplicates: true })
  }

  // Today's graded count in this category, vs the block's quota (its label
  // ends in "× N").
  const { data: cat } = await supabase.from('question_progress')
    .select('question_id, coding_questions!inner(category)').eq('user_id', user.id)
    .eq('coding_questions.category', q.category).gte('last_seen_at', istMidnightUtc())
  const doneToday = cat?.length ?? 0
  const session = await updateBlocks(supabase, user.id, today, blocks => blocks.map(b => {
    if (b.key !== `bank:${q.category as BankCategory}`) return b
    const quota = Number(b.label.match(/× (\d+)$/)?.[1] ?? 0)
    return quota > 0 && doneToday >= quota ? { ...b, done: true } : b
  }))
  revalidatePath('/prep')
  return session
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

// Grades a card and reschedules it. The warm-up block auto-completes once
// nothing is due anymore or 10 cards were reviewed today.
export async function reviewFlashcard(id: string, grade: ReviewGrade): Promise<{ card: Flashcard; session: PrepSession | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const today = todayIST()
  const { data: card } = await supabase.from('flashcards').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!card) throw new Error('Card not found')
  const next = scheduleReview(card as Flashcard, grade, today)
  const { data: updated, error } = await supabase.from('flashcards')
    .update({ ...next, last_reviewed_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)

  const [{ count: stillDue }, { count: reviewed }] = await Promise.all([
    supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', user.id).lte('due_date', today),
    supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('last_reviewed_at', istMidnightUtc()),
  ])
  let session: PrepSession | null = null
  if ((stillDue ?? 0) === 0 || (reviewed ?? 0) >= 10) {
    session = await updateBlocks(supabase, user.id, today, blocks => blocks.map(b => b.key === 'warmup' ? { ...b, done: true } : b))
  }
  revalidatePath('/prep')
  return { card: updated as Flashcard, session }
}

export async function addFlashcard(front: string, back: string, topic: string | null): Promise<Flashcard> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('flashcards')
    .insert({ user_id: user.id, front, back, topic, source: 'manual', due_date: todayIST() }).select('*').single()
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
  return data as Flashcard
}

export async function deleteFlashcard(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('flashcards').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
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
