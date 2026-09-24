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
import { computeReadinessMatrix, weakestAreas, type CodingHistoryRow } from './readiness'
import { COMPETENCIES, READINESS_AREAS } from './types'
import type { Flashcard, PrepBlock, PrepSession, ReviewGrade, Story, StoryRehearsal } from './types'

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

  const flashcards = (cardsRes.data ?? []) as Flashcard[]
  const stories = (storiesRes.data ?? []) as Story[]
  const quizAttempts = (quizRes.data ?? []) as QuizAttempt[]
  const readiness = computeReadinessMatrix(quizAttempts, (codingRes.data ?? []) as unknown as CodingHistoryRow[], stories)
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
    const plan = buildPrepPlan(today, {
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
  }
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

export async function togglePrepBlock(key: PrepBlock['key']): Promise<PrepSession | null> {
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
