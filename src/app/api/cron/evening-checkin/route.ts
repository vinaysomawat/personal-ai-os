import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { getReminderLines } from '@/lib/reminders'
import { sendMessage } from '@/lib/telegram/send'
import { getActiveWorkout } from '@/features/health/workout-core'
import { logCronRun } from '@/lib/cron-log'
import { todayIST, daysAgoIST } from '@/lib/date'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

type StaleMetricKey = 'weight_kg' | 'steps' | 'calories'

const STALE_METRICS: { key: StaleMetricKey; label: string; reason: string; thresholdDays: number }[] = [
  { key: 'weight_kg',   label: 'weight',   reason: 'your trend line is going stale',           thresholdDays: 3 },
  { key: 'steps',       label: 'steps',    reason: 'your activity trend is incomplete',         thresholdDays: 3 },
  { key: 'calories',    label: 'calories', reason: "there's no nutrition trend to work with",   thresholdDays: 3 },
]

// Notification Intelligence (Phase 3 PRD) — a metric only surfaces once it's
// actually gone stale (≥thresholdDays since it was last logged), phrased
// with the real gap, instead of a flat "not logged today" nag every single
// evening regardless of how long it's actually been.
async function computeStaleMetrics(supabase: SupabaseClient, userId: string, today: string): Promise<string[]> {
  const since = daysAgoIST(90)
  const { data } = await supabase
    .from('health_metrics')
    .select('date, weight_kg, steps, calories')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: false })
  const rows = (data ?? []) as Record<StaleMetricKey | 'date', unknown>[]

  const daysBetween = (a: string, b: string) => Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86400000)

  const lines: string[] = []
  for (const m of STALE_METRICS) {
    const lastRow = rows.find(r => r[m.key] !== null && r[m.key] !== undefined)
    const gap = lastRow ? daysBetween(today, lastRow.date as string) : daysBetween(today, since)
    if (gap >= m.thresholdDays) {
      lines.push(`You haven't logged ${m.label} in ${gap} days — ${m.reason}`)
    }
  }
  return lines
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'evening-checkin')
  const today = todayIST()

  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const [tasksRes, expensesRes, staleMetrics, codingRes, activeWorkout] = await Promise.all([
    supabase.from('tasks').select('text').eq('user_id', user.id).eq('done', false).eq('priority', 'high'),
    supabase.from('expenses').select('id').eq('user_id', user.id).eq('date', today).limit(1),
    computeStaleMetrics(supabase, user.id, today),
    supabase.from('coding_daily_questions').select('completed').eq('user_id', user.id).eq('assigned_date', today),
    getActiveWorkout(supabase, user.id),
  ])

  const highPriorityTasks = tasksRes.data ?? []
  const hasExpenseToday = (expensesRes.data ?? []).length > 0
  const codingQuestions = codingRes.data ?? []
  const streakAtRisk = codingQuestions.length > 0 && codingQuestions.some(q => !q.completed)
  const workoutPending = !!activeWorkout

  const reminders = await getReminderLines(supabase, user.id, 'evening')
  const nothingPending = highPriorityTasks.length === 0 && hasExpenseToday && staleMetrics.length === 0 && !streakAtRisk && !workoutPending

  if (nothingPending && !reminders) {
    return NextResponse.json({ ok: true, sent: false, reason: 'Everything already logged today' })
  }

  const lines: string[] = []
  if (streakAtRisk) {
    lines.push(`🔥 *Your coding streak is at risk* — today's question isn't solved yet`)
  }
  if (workoutPending) {
    lines.push(`🏋️ *Today's workout is still open* — ${activeWorkout!.workout.name} (${activeWorkout!.workout.duration_minutes} min)`)
  }
  if (highPriorityTasks.length > 0) {
    lines.push(`🔴 *High-priority tasks pending:*\n${highPriorityTasks.map(t => `• ${t.text}`).join('\n')}`)
  }
  if (!hasExpenseToday) {
    lines.push(`💸 *No expenses logged today* — spent anything?`)
  }
  if (staleMetrics.length > 0) {
    lines.push(`📊 ${staleMetrics.join('\n📊 ')}`)
  }

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `🌙 *Evening Check-in*\n\n${lines.join('\n\n')}${reminders}\n\n_Log these whenever you get a moment — I'll stop asking once everything's in._`)

  return NextResponse.json({ ok: true, sent: true, highPriorityTasks: highPriorityTasks.length, hasExpenseToday, staleMetrics, streakAtRisk, workoutPending })
}
