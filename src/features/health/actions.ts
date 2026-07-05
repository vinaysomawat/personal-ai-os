'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MetricField } from './types'

export async function getHabitsWithLogs() {
  const supabase = await createClient()

  const since = new Date()
  since.setDate(since.getDate() - 6)
  const sinceStr = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('habits')
    .select(`*, logs:habit_logs(id, date)`)
    .gte('habit_logs.date', sinceStr)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getHealthMetrics(days = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', from)
    .order('date', { ascending: false })

  return data ?? []
}

export async function upsertTodayMetric(field: MetricField, value: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split('T')[0]
  await supabase.from('health_metrics').upsert(
    { user_id: user.id, date: today, [field]: value },
    { onConflict: 'user_id,date' }
  )
  revalidatePath('/health')
}

export async function addHabit(name: string, icon: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('habits').insert({ name, icon, user_id: user.id })
  if (error) throw new Error(error.message)
  revalidatePath('/health')
}

export async function logHabit(habitId: string, date: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('habit_logs').insert({ habit_id: habitId, date, user_id: user.id })
  if (error && !error.message.includes('unique')) throw new Error(error.message)
  revalidatePath('/health')
}

export async function unlogHabit(habitId: string, date: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date)
  if (error) throw new Error(error.message)
  revalidatePath('/health')
}

export async function deleteHabit(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/health')
}
