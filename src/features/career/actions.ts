'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import { computeReadiness, daysSinceLastQuiz } from './quiz-calculations'
import { istMidnightUtc } from '@/lib/date'
import { QUIZ_TOPICS } from './types'
import type { AppStatus, Difficulty, JDAnalysis, JobAlert, QuizQuestion, QuizAttempt } from './types'

export async function getCareerData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { applications: [], profile: null, skills: [], quizAttempts: [], recommendedTopic: null, codingStreak: 0, studyStreak: 0, jobAlerts: [] }

  const { computeCodingStats } = await import('@/features/coding/daily-core')
  const { getStudyStreak } = await import('@/features/learning/calculations')

  const [appsRes, profileRes, skillsRes, quizAttemptsRes, codingStats, studyLogsRes, jobAlertsRes] = await Promise.all([
    supabase.from('applications').select('*').order('created_at', { ascending: false }),
    supabase.from('career_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('skills').select('*').eq('user_id', user.id).order('category').order('level'),
    supabase.from('quiz_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    computeCodingStats(supabase, user.id),
    supabase.from('study_logs').select('date').eq('user_id', user.id),
    // Same "checked daily against public job boards" data the job-alerts cron
    // already Telegram-notifies on (src/features/career/job-alerts.ts) — this
    // just surfaces the same job_alerts_seen log in the web app too, rather
    // than it being Telegram-only. 30-day rolling window, capped, best-fit
    // (highest score) first rather than pure recency — the point of scoring
    // is surfacing the highest-value leads first, not just the newest.
    supabase.from('job_alerts_seen').select('*').eq('user_id', user.id).gte('created_at', istMidnightUtc(30)).order('score', { ascending: false }).order('created_at', { ascending: false }).limit(20),
  ])

  const quizAttempts = (quizAttemptsRes.data ?? []) as QuizAttempt[]

  // Cached (recommend_quiz_topic, 6h TTL) — cheap to recompute on every page
  // load since the prompt only changes when readiness data actually changes.
  const { recommendQuizTopic } = await import('@/features/ai/quiz')
  const readinessByTopic = QUIZ_TOPICS.map(topic => {
    const { tier, avgPercent } = computeReadiness(quizAttempts, topic)
    return { topic, tier, avgPercent, daysSinceLastAttempt: daysSinceLastQuiz(quizAttempts.filter(a => a.topic === topic)) }
  })
  const recommendedTopic = await recommendQuizTopic(readinessByTopic, profileRes.data?.target_role ?? null)

  return {
    applications: appsRes.data ?? [],
    profile: profileRes.data ?? null,
    skills: skillsRes.data ?? [],
    quizAttempts,
    recommendedTopic,
    codingStreak: codingStats.currentStreak,
    studyStreak: getStudyStreak(studyLogsRes.data ?? []),
    jobAlerts: (jobAlertsRes.data ?? []) as JobAlert[],
  }
}

export async function upsertCareerProfile(fields: {
  current_role?: string
  current_company?: string
  current_salary?: number | null
  target_role?: string
  years_experience?: number | null
  bio?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('career_profile').upsert(
    { user_id: user.id, ...fields, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  revalidatePath('/career')
}

export async function saveQuizAttempt(
  topic: string, difficulty: Difficulty, questions: QuizQuestion[],
  userAnswers: number[], score: number, weakAreas: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('quiz_attempts').insert({
    user_id: user.id, topic, difficulty, questions,
    user_answers: userAnswers, score, total: questions.length, weak_areas: weakAreas,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function addApplication(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: inserted, error } = await supabase.from('applications').insert({
    user_id: user.id,
    company: formData.get('company') as string,
    role: formData.get('role') as string,
    status: (formData.get('status') as AppStatus) ?? 'applied',
    salary_range: formData.get('salary_range') as string || null,
    location: formData.get('location') as string || null,
    url: formData.get('url') as string || null,
    notes: formData.get('notes') as string || null,
    applied_at: formData.get('applied_at') as string || todayIST(),
    job_description: formData.get('job_description') as string,
  }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/career')
  return inserted
}

/** Persists a JD (+ its AI analysis, computed client-side via `analyzeJobDescription`) onto
 * an application — used both right after adding one and for backfilling/retrying an older one. */
export async function saveApplicationJD(id: string, jobDescription: string, analysis: JDAnalysis | null) {
  const supabase = await createClient()
  const { error } = await supabase.from('applications').update({
    job_description: jobDescription,
    jd_analysis: analysis,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function updateStatus(id: string, status: AppStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('applications').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteApplication(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

