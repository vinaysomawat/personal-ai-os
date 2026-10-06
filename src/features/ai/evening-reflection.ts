'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { gatherTodayActivityLines } from './daily-journal'

const SYSTEM_PROMPT = `You are writing Vinay's Evening Reflection — a same-evening "how did today go" summary from his actual logged activity.

Rules:
- Write exactly ONE paragraph, under 200 words, plain prose — no markdown, no headings, no bullet lists.
- Cover what got done today and how it went, using only the facts given below. Never invent an event, number, or detail that isn't in the data.
- If very little was logged today, say so plainly rather than padding it out.
- Don't invent plans or priorities for tomorrow.`

export interface EveningReflectionResult {
  reflection: string
}

// Daily Operating System's "Evening Reflection" (Phase 5 PRD) — a separate
// live section from Daily Auto Journal's 11pm cron (different purpose: this
// is a same-evening check visible from 6pm on, that one's an end-of-day
// recap that needs to run after even a late-night session). Reuses the same
// activity-gathering as the journal rather than duplicating those queries.
//
// `isLateNight` (set when the client is between midnight and 5am IST — see
// EveningReflection.tsx) reflects on *yesterday* (daysAgo: 1) instead of the
// just-started, nearly-empty new calendar day, so a genuinely late night
// still shows the evening that just happened rather than going blank at
// midnight. (The "Tomorrow's top priority" line was the top pending Planner
// task — removed with the Planner module on 2026-10-07.)
export async function generateEveningReflection(db: SupabaseClient, userId: string, isLateNight: boolean = false): Promise<EveningReflectionResult> {
  const lines = await gatherTodayActivityLines(db, userId, isLateNight ? 1 : 0)
  if (lines.length === 1) {
    return { reflection: 'Not much was logged today — a genuinely quiet day.' }
  }

  const prompt = `Today's logged activity:\n${lines.join('\n')}\n\nWrite Vinay's Evening Reflection.`
  const reflection = await askAI('evening_reflection', prompt, SYSTEM_PROMPT, { userId })
  return { reflection }
}
