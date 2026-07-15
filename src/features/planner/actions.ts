'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Priority, Recurrence } from './types'

export async function getTasks() {
  const supabase = await createClient()
  const [tasksRes, codingRes, readingRes] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('coding_daily_questions').select('task_id, question:coding_questions(url)').not('task_id', 'is', null),
    supabase.from('trending_readings').select('task_id, url').not('task_id', 'is', null),
  ])

  if (tasksRes.error) throw new Error(tasksRes.error.message)

  // External link for tasks auto-created by Coding (daily question / trending
  // read) — task_id lives on those tables, not on tasks itself, so build a
  // reverse lookup instead of storing a redundant column on every task.
  const linkByTaskId = new Map<string, string>()
  for (const row of (codingRes.data ?? []) as unknown as { task_id: string | null; question: { url: string | null } | null }[]) {
    if (row.task_id && row.question?.url) linkByTaskId.set(row.task_id, row.question.url)
  }
  for (const row of (readingRes.data ?? []) as { task_id: string | null; url: string | null }[]) {
    if (row.task_id && row.url) linkByTaskId.set(row.task_id, row.url)
  }

  const data = (tasksRes.data ?? []).map(t => ({ ...t, external_url: linkByTaskId.get(t.id) ?? null }))
  return data
}

export async function addTask(text: string, priority: Priority = 'medium', area: string = 'General', recurrence: Recurrence | null = null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('tasks').insert({
    text, priority, area, recurrence, user_id: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/planner')
}

export async function toggleTask(id: string, done: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // If completing a recurring task, create next instance before marking done
  if (done) {
    const { data: task } = await supabase.from('tasks').select('text, priority, area, recurrence').eq('id', id).single()
    if (task?.recurrence) {
      await supabase.from('tasks').insert({
        user_id: user.id,
        text: task.text,
        priority: task.priority,
        area: task.area,
        recurrence: task.recurrence,
        done: false,
      })
    }
  }

  const { error } = await supabase.from('tasks').update({ done }).eq('id', id)
  if (error) throw new Error(error.message)

  // Two-way sync: if this task was auto-created for a coding practice question, keep it in sync
  await supabase.from('coding_daily_questions')
    .update({ completed: done, completed_at: done ? new Date().toISOString() : null })
    .eq('task_id', id)

  // Same sync for the daily trending reading
  await supabase.from('trending_readings')
    .update({ completed: done, completed_at: done ? new Date().toISOString() : null })
    .eq('task_id', id)

  // Same sync for the Daily Workout Planner — status is an enum here (not a
  // plain boolean), so map done -> completed / pending. Completing also
  // needs the fuller markWorkoutComplete logic (feeds the workouts log used
  // by the Health Score, prunes history), so route through that instead of
  // a raw status update — it's a harmless no-op re-write of tasks.done.
  if (done) {
    const { data: dw } = await supabase.from('daily_workouts').select('id').eq('task_id', id).in('status', ['pending', 'in_progress']).maybeSingle()
    if (dw) {
      const { markWorkoutComplete } = await import('@/features/health/workout-core')
      await markWorkoutComplete(supabase, dw.id)
    }
  } else {
    await supabase.from('daily_workouts')
      .update({ status: 'pending', completed_at: null })
      .eq('task_id', id).eq('status', 'completed')
  }

  revalidatePath('/planner')
  revalidatePath('/coding')
  revalidatePath('/health')
  revalidatePath('/dashboard')
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/planner')
}

export async function updatePriority(id: string, priority: Priority) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ priority })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/planner')
}
