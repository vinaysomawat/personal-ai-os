'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateTrendingReadingForUser, markTrendingReadingComplete } from './core'

export async function getTodayReading() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return generateTrendingReadingForUser(supabase, user.id)
}

export async function completeReading(id: string) {
  const supabase = await createClient()
  await markTrendingReadingComplete(supabase, id)
  revalidatePath('/coding')
  revalidatePath('/planner')
}
