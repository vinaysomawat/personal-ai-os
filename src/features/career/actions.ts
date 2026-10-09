'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/date'
import { syncInterviewQuestionToBank } from './bank-sync'
import { addDays, type Outreach, type OutreachChannel, type OutreachStatus } from './pipeline'
import type { AppStatus, Application, InterviewQuestion, InterviewRound, JDAnalysis, QuestionCategory, RoundKind } from './types'

// Interviews (Career, v3.4): only companies that reached a phone screen are
// tracked — each with its rounds and every question the interviewers asked.
export async function getCareerData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { applications: [], profile: null, rounds: [], questions: [], outreach: [], outreachTarget: 15 }

  const [appsRes, profileRes, roundsRes, questionsRes, outreachRes, settingsRes] = await Promise.all([
    supabase.from('applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('career_profile').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('interview_rounds').select('*').eq('user_id', user.id).order('scheduled_at', { ascending: true, nullsFirst: false }),
    supabase.from('interview_questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    // Outreach for the funnel (5 weeks) plus anything still awaiting a follow-up.
    supabase.from('outreach').select('*').eq('user_id', user.id).or(`sent_at.gte.${addDays(todayIST(), -42)},and(status.eq.sent,follow_up_on.not.is.null)`).order('sent_at', { ascending: false }),
    supabase.from('prep_settings').select('weekly_outreach_target').eq('user_id', user.id).maybeSingle(),
  ])
  return {
    applications: (appsRes.data ?? []) as Application[],
    profile: profileRes.data ?? null,
    // Empty (not an error) until the interviews migration has run.
    rounds: (roundsRes.data ?? []) as InterviewRound[],
    questions: (questionsRes.data ?? []) as InterviewQuestion[],
    outreach: (outreachRes.data ?? []) as Outreach[],
    outreachTarget: settingsRes.data?.weekly_outreach_target ?? 15,
  }
}

async function userClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, userId: user.id }
}

const done = () => { revalidatePath('/interviews'); revalidatePath('/prep'); revalidatePath('/dashboard') }

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
  revalidatePath('/interviews')
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
  revalidatePath('/interviews')
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

// Questions that went badly / ok are copied into the Question Bank (and
// re-rated if they later went well) — see bank-sync.ts.
export async function addQuestion(input: { application_id: string; round_id: string | null; question: string; category: QuestionCategory; topic?: string | null; my_answer: string | null; went: InterviewQuestion['went']; notes: string | null }): Promise<InterviewQuestion> {
  const { supabase, userId } = await userClient()
  const { data, error } = await supabase.from('interview_questions').insert({ user_id: userId, ...input, topic: input.topic || null, question: input.question.trim() }).select('*').single()
  if (error) throw new Error(error.message)
  const bankId = await syncInterviewQuestionToBank(supabase, userId, data as InterviewQuestion)
  done()
  return { ...(data as InterviewQuestion), bank_question_id: bankId }
}

export async function updateQuestion(id: string, patch: Partial<Pick<InterviewQuestion, 'question' | 'category' | 'topic' | 'my_answer' | 'went' | 'notes' | 'round_id'>>) {
  const { supabase, userId } = await userClient()
  const { data, error } = await supabase.from('interview_questions').update(patch).eq('id', id).select('*').single()
  if (error) throw new Error(error.message)
  if (patch.went !== undefined || patch.my_answer !== undefined) await syncInterviewQuestionToBank(supabase, userId, data as InterviewQuestion)
  done()
}

export async function deleteQuestion(id: string) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('interview_questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/interviews')
}

// ---------------- Outreach (v4.0 §4.5) ----------------

export async function addOutreach(input: { company: string; person: string | null; channel: OutreachChannel; count: number; notes: string | null }): Promise<Outreach> {
  const { supabase, userId } = await userClient()
  const today = todayIST()
  const { data, error } = await supabase.from('outreach').insert({
    user_id: userId, company: input.company.trim() || 'Various', person: input.person || null, channel: input.channel,
    count: Math.max(1, Math.round(input.count) || 1), sent_at: today, notes: input.notes || null,
    // Non-application outreach gets a 5-day follow-up by default.
    follow_up_on: input.channel === 'application' ? null : addDays(today, 5),
  }).select('*').single()
  if (error) throw new Error(error.message)
  done()
  return data as Outreach
}

export async function updateOutreach(id: string, patch: { status?: OutreachStatus; follow_up_on?: string | null }) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('outreach').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  done()
}

export async function deleteOutreach(id: string) {
  const { supabase } = await userClient()
  const { error } = await supabase.from('outreach').delete().eq('id', id)
  if (error) throw new Error(error.message)
  done()
}
