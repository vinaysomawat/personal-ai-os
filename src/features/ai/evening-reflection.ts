'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { todayIST } from '@/lib/date'
import { gatherTodayActivityLines } from './daily-journal'

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

const SYSTEM_PROMPT = `You are writing Vinay's Evening Reflection — a same-evening "how did today go" summary from his actual logged activity.

Rules:
- Write exactly ONE paragraph, under 200 words, plain prose — no markdown, no headings, no bullet lists.
- Cover what got done today and how it went, using only the facts given below. Never invent an event, number, or detail that isn't in the data.
- If very little was logged today, say so plainly rather than padding it out.
- Don't mention tomorrow's plans or priorities — that's shown as its own separate line, not part of this paragraph.`

export interface EveningReflectionResult {
  reflection: string
  tomorrowsPriority: string | null
}

// Daily Operating System's "Evening Reflection" (Phase 5 PRD) — a separate
// live section from Daily Auto Journal's 11pm cron (different purpose: this
// is a same-evening check visible from 6pm on, that one's an end-of-day
// recap that needs to run after even a late-night session). Reuses the same
// activity-gathering as the journal rather than duplicating those queries.
//
// Tomorrow's priority (Product Principle 2 — rule engine before AI) is
// picked here deterministically, same overdue-first/priority-rank sort the
// Dashboard's own Top Priority banner uses, then shown as its own line
// rather than woven into the AI's prose — the AI's only job is summarizing
// the day, never picking or paraphrasing which task matters most.
export async function generateEveningReflection(db: SupabaseClient, userId: string): Promise<EveningReflectionResult> {
  const today = todayIST()

  const [lines, { data: pendingTasks }] = await Promise.all([
    gatherTodayActivityLines(db, userId),
    db.from('tasks').select('text, priority, due_date').eq('user_id', userId).eq('done', false),
  ])

  const tasks = (pendingTasks ?? []) as { text: string; priority: string; due_date: string | null }[]
  const sorted = [...tasks].sort((a, b) => {
    const aOverdue = !!a.due_date && a.due_date < today
    const bOverdue = !!b.due_date && b.due_date < today
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
  })
  const topTask = sorted[0]
  const tomorrowsPriority = topTask
    ? `${topTask.text}${topTask.due_date && topTask.due_date < today ? ' (overdue)' : ''}`
    : null

  if (lines.length === 1 && !topTask) {
    return { reflection: "Not much was logged today, and there's nothing pending for tomorrow either — a genuinely quiet day.", tomorrowsPriority: null }
  }

  const prompt = `Today's logged activity:\n${lines.join('\n')}\n\nWrite Vinay's Evening Reflection.`
  const reflection = await askAI('evening_reflection', prompt, SYSTEM_PROMPT, { userId })
  return { reflection, tomorrowsPriority }
}
