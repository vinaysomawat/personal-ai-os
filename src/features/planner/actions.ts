'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Priority, Recurrence } from './types'

export async function getTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
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

  revalidatePath('/planner')
  revalidatePath('/coding')
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
