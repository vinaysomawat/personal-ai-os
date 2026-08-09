'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST, daysAgoIST } from '@/lib/date'
import { getResourcesNeedingRevision } from './calculations'
import { SUGGESTED_RESOURCES } from './suggested-resources'
import { recommendResources } from '@/features/ai/study-plan'
import type { ResourceStatus, Resource, QuizQuestion } from './types'

// Pending queue never allowed to drop below this — matches the user's own
// "top up once it gets to ~5" rule. Tops up to a small buffer above the
// threshold rather than exactly to it, so it doesn't refill one at a time.
const MIN_PENDING = 5
const TOPUP_TARGET = 8

type ResourceInsert = Pick<Resource, 'title' | 'type' | 'url' | 'category' | 'notes'>

export async function getLearningData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { resources: [], studyLogs: [], resourceQuizAttempts: [] }

  const since = daysAgoIST(30)

  const [resourcesRes, logsRes, quizAttemptsRes] = await Promise.all([
    supabase.from('resources').select('*').order('created_at', { ascending: false }),
    supabase.from('study_logs').select('*').eq('user_id', user.id).gte('date', since).order('date', { ascending: false }),
    supabase.from('resource_quiz_attempts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  let resources = resourcesRes.data ?? []
  const studyLogs = logsRes.data ?? []

  // Rule-based (Product Principle 2), not AI: a completed resource with no
  // study activity in 14+ days probably means it's been forgotten. Instead
  // of a passive nudge, re-insert it as a fresh not-started resource so it
  // re-enters the active queue — guarded so a title already sitting
  // not-started isn't duplicated on every page load.
  const needsRevision = getResourcesNeedingRevision(resources, studyLogs)
  const existingNotStartedTitles = new Set(resources.filter(r => r.status === 'not-started').map(r => r.title))
  const toRevive = needsRevision.filter(r => !existingNotStartedTitles.has(r.title))
  if (toRevive.length > 0) {
    const revived = await insertResources(supabase, user.id, toRevive.map(r => ({
      title: r.title, type: r.type, url: r.url, category: r.category,
      notes: 'Auto-added for revision — no activity in 14+ days, might have been forgotten.',
    })))
    resources = [...revived, ...resources]
  }

  // Rule-based top-up: keep the pending queue from running dry. Curated
  // (free, deterministic) picks are used first; the AI recommender only
  // fills in if the curated pool is exhausted for categories not yet dismissed.
  const pendingCount = resources.filter(r => r.status !== 'completed').length
  if (pendingCount <= MIN_PENDING) {
    const existingTitles = new Set(resources.map(r => r.title))
    const existingUrls = new Set(resources.map(r => r.url).filter(Boolean))
    const need = TOPUP_TARGET - pendingCount

    const curatedPicks = SUGGESTED_RESOURCES
      .filter(s => !existingTitles.has(s.title) && !existingUrls.has(s.url))
      .slice(0, need)

    let added: ResourceInsert[] = curatedPicks.map(s => ({ title: s.title, type: s.type, url: s.url, category: s.category, notes: s.notes }))

    if (added.length < need) {
      const aiPicks = await recommendResources(resources, [...existingTitles, ...added.map(a => a.title)])
      added = [...added, ...aiPicks.slice(0, need - added.length).map(p => ({
        title: p.title, type: p.type, url: null, category: p.category,
        notes: `Auto-added: ${p.reason}`,
      }))]
    }

    if (added.length > 0) {
      const insertedTopup = await insertResources(supabase, user.id, added)
      resources = [...insertedTopup, ...resources]
    }
  }

  return {
    resources,
    studyLogs,
    resourceQuizAttempts: quizAttemptsRes.data ?? [],
  }
}

// Shared by the revision auto-readd and the pending-queue top-up — both add
// resources with no linked Planner task (unlike a user-initiated addResource,
// these are silent background inserts, not something the user needs a task
// reminder for).
async function insertResources(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, items: ResourceInsert[]): Promise<Resource[]> {
  const { data, error } = await supabase.from('resources').insert(
    items.map(item => ({
      user_id: userId, title: item.title, type: item.type, url: item.url, category: item.category,
      status: 'not-started', progress: 0, notes: item.notes, task_id: null,
    }))
  ).select('*')
  if (error) return []
  return data ?? []
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

  const estimatedMinutes = formData.get('estimated_minutes') as string
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
    estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
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

export async function saveResourceQuizAttempt(
  resourceId: string | null, resourceTitle: string, category: string,
  questions: QuizQuestion[], userAnswers: number[], score: number, weakAreas: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('resource_quiz_attempts').insert({
    user_id: user.id,
    resource_id: resourceId,
    resource_title: resourceTitle,
    category,
    questions,
    user_answers: userAnswers,
    score,
    total: questions.length,
    weak_areas: weakAreas,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/learning')
}
