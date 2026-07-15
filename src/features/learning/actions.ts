'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST, daysAgoIST } from '@/lib/date'
import type { ResourceStatus } from './types'

export async function getLearningData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { resources: [], studyLogs: [] }

  const since = daysAgoIST(30)

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

  const today = todayIST()
  const { error } = await supabase.from('study_logs').insert({
    user_id: user.id,
    date: today,
    resource_id: resourceId,
    duration_minutes: durationMinutes,
    notes,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/learning')
  revalidatePath('/dashboard')
}

export async function addResource(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const title = formData.get('title') as string

  // Two-way sync with Planner, same pattern as Coding's daily question and
  // Trending Reading: insert the task first, then link the resource to it.
  const { data: task } = await supabase
    .from('tasks')
    .insert({ text: `Read: ${title}`, priority: 'low', area: 'Learning', user_id: user.id, done: false })
    .select('id')
    .single()

  const { error } = await supabase.from('resources').insert({
    user_id: user.id,
    title,
    type: formData.get('type') as string,
    url: formData.get('url') as string || null,
    category: formData.get('category') as string || 'General',
    status: 'not-started',
    progress: 0,
    notes: formData.get('notes') as string || null,
    task_id: task?.id ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/learning')
  revalidatePath('/planner')
}

export async function updateResource(id: string, updates: { status?: ResourceStatus; progress?: number; notes?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').update(updates).eq('id', id)
  if (error) throw new Error(error.message)

  if (updates.status !== undefined) {
    const { data: resource } = await supabase.from('resources').select('task_id').eq('id', id).single()
    if (resource?.task_id) {
      await supabase.from('tasks').update({ done: updates.status === 'completed' }).eq('id', resource.task_id)
    }
  }

  revalidatePath('/learning')
  revalidatePath('/planner')
  revalidatePath('/dashboard')
}

export async function deleteResource(id: string) {
  const supabase = await createClient()
  const { data: resource } = await supabase.from('resources').select('task_id').eq('id', id).single()

  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (resource?.task_id) {
    await supabase.from('tasks').delete().eq('id', resource.task_id)
  }

  revalidatePath('/learning')
  revalidatePath('/planner')
}
