'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { todayIST, istMidnightUtc } from '@/lib/date'
import { isMarkedToday } from '@/features/learning/daily-read'

const SYSTEM_PROMPT = `You are writing Vinay's Daily Auto Journal — a nightly "what happened today" entry from his actual logged activity across Work, Learning, Health, Finance, and Career.

Rules:
- Write exactly ONE paragraph, under 150 words, plain prose — no markdown, no headings, no bullet lists.
- Weave in highlights, challenges, and wins naturally rather than as labeled sections.
- Use only the facts given below. Never invent an event, number, or detail that isn't in the data.
- If very little was logged today, say so plainly rather than padding it out.
- Be specific and grounded — reference the actual numbers/items given, not generic reflection.`

// Shared by Daily Auto Journal (Phase 3 PRD) and Evening Reflection (Phase 5
// PRD) — both narrate "today's itemized activity," just at different times
// of day and with a different closing line. Deliberately scoped to what's
// reliably timestamped: tasks.done has no completed_at (only coding's/the
// daily-read resource's synced rows do), so plain Planner task completions
// aren't included — see README.
export async function gatherTodayActivityLines(db: SupabaseClient, userId: string): Promise<string[]> {
  const today = todayIST()

  const [
    codingRes, resourcesRes, studyRes, metricRes,
    workoutsRes, expensesRes, quizRes, appsRes,
  ] = await Promise.all([
    db.from('coding_daily_questions').select('completed').eq('user_id', userId).eq('assigned_date', today),
    db.from('resources').select('status, title, notes, created_at').eq('user_id', userId),
    db.from('study_logs').select('duration_minutes').eq('user_id', userId).eq('date', today),
    db.from('health_metrics').select('weight_kg, calories, protein_g, steps').eq('user_id', userId).eq('date', today).maybeSingle(),
    db.from('workouts').select('type, duration_minutes').eq('user_id', userId).eq('date', today),
    db.from('expenses').select('amount, category').eq('user_id', userId).eq('date', today),
    db.from('quiz_attempts').select('topic, score, total').eq('user_id', userId).gte('created_at', istMidnightUtc()),
    db.from('applications').select('company, role').eq('user_id', userId).eq('applied_at', today),
  ])

  const lines: string[] = [`Date: ${today}`]

  const codingSolved = (codingRes.data ?? []).some(q => q.completed)
  if (codingSolved) lines.push('Solved today\'s coding question')

  const dailyRead = (resourcesRes.data ?? []).find(r => isMarkedToday(r) && r.status === 'completed')
  if (dailyRead) lines.push(`Read today's article: "${dailyRead.title}"`)

  const studyMinutes = (studyRes.data ?? []).reduce((s, r) => s + (r.duration_minutes ?? 0), 0)
  if (studyMinutes > 0) lines.push(`Studied for ${studyMinutes} minutes`)

  const metric = metricRes.data
  if (metric) {
    const parts: string[] = []
    if (metric.weight_kg) parts.push(`weight ${metric.weight_kg}kg`)
    if (metric.calories) parts.push(`${metric.calories} calories`)
    if (metric.protein_g) parts.push(`${metric.protein_g}g protein`)
    if (metric.steps) parts.push(`${metric.steps} steps`)
    if (parts.length > 0) lines.push(`Health metrics logged: ${parts.join(', ')}`)
  }

  const workouts = workoutsRes.data ?? []
  if (workouts.length > 0) lines.push(`Worked out: ${workouts.map(w => `${w.type} (${w.duration_minutes ?? '?'} min)`).join(', ')}`)

  const expenses = expensesRes.data ?? []
  if (expenses.length > 0) {
    const total = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
    lines.push(`Spent ₹${Math.round(total).toLocaleString('en-IN')} across ${expenses.length} expense${expenses.length > 1 ? 's' : ''}`)
  }

  const quizzes = quizRes.data ?? []
  if (quizzes.length > 0) lines.push(`Took ${quizzes.length} interview prep quiz${quizzes.length > 1 ? 'zes' : ''}: ${quizzes.map(q => `${q.topic} (${q.score}/${q.total})`).join(', ')}`)

  const apps = appsRes.data ?? []
  if (apps.length > 0) lines.push(`Submitted ${apps.length} new application${apps.length > 1 ? 's' : ''}: ${apps.map(a => `${a.company} (${a.role})`).join(', ')}`)

  return lines
}

export async function generateDailyJournal(db: SupabaseClient, userId: string): Promise<string> {
  const lines = await gatherTodayActivityLines(db, userId)

  if (lines.length === 1) {
    return "Nothing was logged today — a quiet day in the system, even if not necessarily in real life."
  }

  const prompt = `Today's logged activity:\n${lines.join('\n')}\n\nWrite Vinay's Daily Auto Journal entry for today.`
  return askAI('daily_journal', prompt, SYSTEM_PROMPT, { userId })
}

// Idempotent — a cron retry on the same day upserts rather than duplicates.
export async function saveDailyJournal(db: SupabaseClient, userId: string, paragraph: string): Promise<void> {
  await db.from('daily_journals').upsert(
    { user_id: userId, date: todayIST(), paragraph },
    { onConflict: 'user_id,date' }
  )
}
