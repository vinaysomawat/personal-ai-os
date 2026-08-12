'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import { getTodaysQuizQuestions, gradeTodaysQuiz, shuffleQuestion, TODAYS_QUIZ_BANK, type QuizQuestion } from './todays-quiz'

export interface TodaysQuizAttempt {
  questionIds: string[]
  answers: Record<string, number>
  score: number
  total: number
}

export interface TodaysQuizData {
  questions: QuizQuestion[]
  attempt: TodaysQuizAttempt | null
}

export async function getTodaysQuizData(): Promise<TodaysQuizData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayIST()
  if (!user) return { questions: getTodaysQuizQuestions(today), attempt: null }

  const { data: row } = await supabase
    .from('coding_quiz_attempts')
    .select('question_ids, answers, score, total')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  // An existing attempt "locks in" the same questions it was originally
  // graded against, so a Retake redoes the exact same 10 even if the
  // curated pool has since been edited/expanded.
  if (row) {
    const byId = new Map(TODAYS_QUIZ_BANK.map(q => [q.id, q]))
    return {
      questions: (row.question_ids as string[]).map((id: string) => byId.get(id)).filter((q): q is QuizQuestion => !!q).map(q => shuffleQuestion(q, today)),
      attempt: { questionIds: row.question_ids, answers: row.answers, score: row.score, total: row.total },
    }
  }
  return { questions: getTodaysQuizQuestions(today), attempt: null }
}

export async function saveTodaysQuizAttempt(questionIds: string[], answers: Record<string, number>): Promise<{ score: number; total: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = todayIST()
  const score = gradeTodaysQuiz(questionIds, answers, today)
  const total = questionIds.length

  await supabase.from('coding_quiz_attempts').upsert(
    { user_id: user.id, date: today, question_ids: questionIds, answers, score, total },
    { onConflict: 'user_id,date' }
  )
  revalidatePath('/coding')
  return { score, total }
}
