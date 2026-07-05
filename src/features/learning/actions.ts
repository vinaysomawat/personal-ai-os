'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ResourceStatus } from './types'

export async function getLearningData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { resources: [], studyLogs: [] }

  const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [resourcesRes, logsRes] = await Promise.all([
    supabase.from('resources').select('*').order('created_at', { ascending: false }),
    supabase.from('study_logs').select('*').eq('user_id', user.id).gte('date', since).order('date', { ascending: false }),
  ])

  return {
    resources: resourcesRes.data ?? [],
    studyLogs: logsRes.data ?? [],
  }
}

export async function logStudySession(resourceId: string | null, durationMinutes: number, notes: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split('T')[0]
  await supabase.from('study_logs').insert({
    user_id: user.id,
    date: today,
    resource_id: resourceId,
    duration_minutes: durationMinutes,
    notes,
  })
  revalidatePath('/learning')
}

export async function addResource(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('resources').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    type: formData.get('type') as string,
    url: formData.get('url') as string || null,
    category: formData.get('category') as string || 'General',
    status: 'not-started',
    progress: 0,
    notes: formData.get('notes') as string || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/learning')
}

export async function updateResource(id: string, updates: { status?: ResourceStatus; progress?: number; notes?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/learning')
}

export async function deleteResource(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/learning')
}
