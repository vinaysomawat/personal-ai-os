'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AppStatus } from './types'

export async function getApplications() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
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
  })

  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function updateStatus(id: string, status: AppStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/career')
}

export async function deleteApplication(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/career')
}
