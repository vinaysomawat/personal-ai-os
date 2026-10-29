'use server'

import { createClient } from '@/lib/supabase/server'
import { prepToday } from '@/lib/date'

// Counts for the nav's badges, fetched by TopNav after the page renders (so
// no page waits on it): Prep = today's plan blocks not done yet. One read.
export async function getNavBadges(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await supabase.from('prep_sessions').select('blocks').eq('user_id', user.id).eq('date', prepToday()).maybeSingle()
  const left = ((data?.blocks ?? []) as { done: boolean }[]).filter(b => !b.done).length
  return { '/prep': left }
}
