'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AppStatus, SkillLevel, Difficulty } from './types'

export async function getCareerData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { applications: [], profile: null, skills: [], qa: [], codingStreak: 0, studyStreak: 0, resumeVersions: [] }

  const { computeCodingStats } = await import('@/features/coding/daily-core')
  const { getStudyStreak } = await import('@/features/learning/calculations')

  const [appsRes, profileRes, skillsRes, qaRes, codingStats, studyLogsRes, resumeRes] = await Promise.all([
    supabase.from('applications').select('*').order('created_at', { ascending: false }),
    supabase.from('career_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('skills').select('*').eq('user_id', user.id).order('category').order('level'),
    supabase.from('interview_qa').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    computeCodingStats(supabase, user.id),
    supabase.from('study_logs').select('date').eq('user_id', user.id),
    supabase.from('resume_versions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return {
    applications: appsRes.data ?? [],
    profile: profileRes.data ?? null,
    skills: skillsRes.data ?? [],
    qa: qaRes.data ?? [],
    codingStreak: codingStats.currentStreak,
    studyStreak: getStudyStreak(studyLogsRes.data ?? []),
    resumeVersions: resumeRes.data ?? [],
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

export async function addSkill(name: string, category: string, level: SkillLevel) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('skills').insert({ user_id: user.id, name, category, level })
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function updateSkillLevel(id: string, level: SkillLevel) {
  const supabase = await createClient()
  const { error } = await supabase.from('skills').update({ level }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteSkill(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('skills').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function addInterviewQA(question: string, answer: string | null, topic: string, difficulty: Difficulty) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('interview_qa').insert({ user_id: user.id, question, answer, topic, difficulty })
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function updateQAAnswer(id: string, answer: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('interview_qa').update({ answer }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteInterviewQA(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('interview_qa').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function addApplication(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('applications').insert({
    user_id: user.id,
    company: formData.get('company') as string,
    role: formData.get('role') as string,
    status: (formData.get('status') as AppStatus) ?? 'applied',
    salary_range: formData.get('salary_range') as string || null,
    location: formData.get('location') as string || null,
    url: formData.get('url') as string || null,
    notes: formData.get('notes') as string || null,
    applied_at: formData.get('applied_at') as string || new Date().toISOString().split('T')[0],
    resume_version_id: formData.get('resume_version_id') as string || null,
  })
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

export async function addResumeVersion(name: string, content: string | null, url: string | null, notes: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // First version is automatically primary
  const { count } = await supabase.from('resume_versions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  const { error } = await supabase.from('resume_versions').insert({
    user_id: user.id, name, content, url, notes, is_primary: (count ?? 0) === 0,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function setPrimaryResumeVersion(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await supabase.from('resume_versions').update({ is_primary: false }).eq('user_id', user.id)
  const { error } = await supabase.from('resume_versions').update({ is_primary: true, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteResumeVersion(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resume_versions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/career')
}
