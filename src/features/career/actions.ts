'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import type { AppStatus, Application, InterviewQuestion, InterviewRound, JDAnalysis, QuestionCategory, RoundKind } from './types'

// Interviews (Career, v3.4): only companies that reached a phone screen are
// tracked — each with its rounds and every question the interviewers asked.
export async function getCareerData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { applications: [], profile: null, skills: [], rounds: [], questions: [], codingStreak: 0 }

  const { computeCodingStats } = await import('@/features/coding/daily-core')
  const [appsRes, profileRes, skillsRes, roundsRes, questionsRes, codingStats] = await Promise.all([
    supabase.from('applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('career_profile').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('skills').select('*').eq('user_id', user.id).order('category').order('level'),
    supabase.from('interview_rounds').select('*').eq('user_id', user.id).order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('interview_questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    computeCodingStats(supabase, user.id),
  ])
  return {
    applications: (appsRes.data ?? []) as Application[],
    profile: profileRes.data ?? null,
    skills: skillsRes.data ?? [],
    // Empty (not an error) until the interviews migration has run.
    rounds: (roundsRes.data ?? []) as InterviewRound[],
    questions: (questionsRes.data ?? []) as InterviewQuestion[],
    codingStreak: codingStats.currentStreak,
  }
}

async function userClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

const done = () => { revalidatePath('/career'); revalidatePath('/prep'); revalidatePath('/dashboard') }

export async function upsertCareerProfile(fields: {
  current_role?: string
  current_company?: string
  current_salary?: number | null
  target_role?: string
  years_experience?: number | null
  bio?: string
}) {
  const { supabase, userId } = await userClient()
  await supabase.from('career_profile').upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  revalidatePath('/career')
}

// ---------------- Companies ----------------

export async function addCompany(input: { company: string; role: string; status: AppStatus; url: string | null; job_description: string | null; notes: string | null }): Promise<Application> {
  const { supabase, userId } = await userClient()
  const { data, error } = await supabase.from('applications').insert({
    user_id: userId, company: input.company.trim(), role: input.role.trim(), status: input.status,
    url: input.url || null, job_description: input.job_description || null, notes: input.notes || null, applied_at: todayIST(),
  }).select('*').single()
  if (error) throw new Error(error.message)
  done()
  return data as Application
}

export async function updateCompany(id: string, patch: Partial<Pick<Application, 'status' | 'role' | 'url' | 'notes' | 'job_description'>>) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('applications').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  done()
}

/** Persists a JD's AI analysis (computed on demand via analyzeJobDescription). */
export async function saveApplicationJD(id: string, jobDescription: string, analysis: JDAnalysis | null) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('applications').update({ job_description: jobDescription, jd_analysis: analysis }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteApplication(id: string) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done()
}

// ---------------- Rounds ----------------

export async function addRound(input: { application_id: string; kind: RoundKind; scheduled_at: string | null; interviewer: string | null }): Promise<InterviewRound> {
  const { supabase, userId } = await userClient()
  const { data, error } = await supabase.from('interview_rounds').insert({ user_id: userId, ...input }).select('*').single()
  if (error) throw new Error(error.message)
  // A scheduled round past the phone screen moves the company to Interviewing.
  if (input.kind !== 'recruiter' && input.kind !== 'phone_screen') {
    await supabase.from('applications').update({ status: 'interview' }).eq('id', input.application_id).eq('status', 'screening')
  }
  done()
  return data as InterviewRound
}

export async function updateRound(id: string, patch: Partial<Pick<InterviewRound, 'kind' | 'scheduled_at' | 'status' | 'outcome' | 'interviewer' | 'notes'>>) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('interview_rounds').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  done()
}

export async function deleteRound(id: string) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('interview_rounds').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done()
}

// ---------------- Questions asked ----------------

export async function addQuestion(input: { application_id: string; round_id: string | null; question: string; category: QuestionCategory; my_answer: string | null; went: InterviewQuestion['went']; notes: string | null }): Promise<InterviewQuestion> {
  const { supabase, userId } = await userClient()
  const { data, error } = await supabase.from('interview_questions').insert({ user_id: userId, ...input, question: input.question.trim() }).select('*').single()
  if (error) throw new Error(error.message)
  revalidatePath('/career')
  return data as InterviewQuestion
}

export async function updateQuestion(id: string, patch: Partial<Pick<InterviewQuestion, 'question' | 'category' | 'my_answer' | 'went' | 'notes' | 'round_id'>>) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('interview_questions').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteQuestion(id: string) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('interview_questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}
