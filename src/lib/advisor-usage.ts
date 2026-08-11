'use server'

import { createClient } from '@/lib/supabase/server'

// Fire-and-forget usage telemetry for AI advisor panels — no scoring, just a
// row per open/tab-switch so real engagement data exists after a couple
// weeks instead of guessing which advisors are worth keeping. A logging
// failure must never break the panel it's attached to.
export async function logAdvisorUsage(advisor: string, tab?: string): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('advisor_usage_log').insert({ user_id: user.id, advisor, tab: tab ?? null })
  } catch {
    // Non-fatal: a logging failure shouldn't break the advisor UI
  }
}
