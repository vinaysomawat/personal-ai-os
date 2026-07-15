import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getReminderLines } from '@/lib/reminders'
import { sendMessage } from '@/lib/telegram/send'
import { getActiveWorkout } from '@/features/health/workout-core'
import { logCronRun } from '@/lib/cron-log'
import { todayIST } from '@/lib/date'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

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

  const [tasksRes, expensesRes, metricRes, codingRes, activeWorkout] = await Promise.all([
    supabase.from('tasks').select('text').eq('user_id', user.id).eq('done', false).eq('priority', 'high'),
    supabase.from('expenses').select('id').eq('user_id', user.id).eq('date', today).limit(1),
    supabase.from('health_metrics').select('weight_kg, calories, sleep_hours, steps').eq('user_id', user.id).eq('date', today).single(),
    supabase.from('coding_daily_questions').select('completed').eq('user_id', user.id).eq('assigned_date', today),
    getActiveWorkout(supabase, user.id),
  ])

  const highPriorityTasks = tasksRes.data ?? []
  const hasExpenseToday = (expensesRes.data ?? []).length > 0
  const metric = metricRes.data
  const codingQuestions = codingRes.data ?? []
  const streakAtRisk = codingQuestions.length > 0 && codingQuestions.some(q => !q.completed)
  const workoutPending = !!activeWorkout

  const missingMetrics: string[] = []
  if (!metric?.weight_kg) missingMetrics.push('weight')
  if (!metric?.sleep_hours) missingMetrics.push('sleep')
  if (!metric?.steps) missingMetrics.push('steps')
  if (!metric?.calories) missingMetrics.push('calories')

  const reminders = await getReminderLines(supabase, user.id, 'evening')
  const nothingPending = highPriorityTasks.length === 0 && hasExpenseToday && missingMetrics.length === 0 && !streakAtRisk && !workoutPending

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
  if (missingMetrics.length > 0) {
    lines.push(`📊 *Health metrics not logged:* ${missingMetrics.join(', ')}`)
  }

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `🌙 *Evening Check-in*\n\n${lines.join('\n\n')}${reminders}\n\n_Log these whenever you get a moment — I'll stop asking once everything's in._`)

  return NextResponse.json({ ok: true, sent: true, highPriorityTasks: highPriorityTasks.length, hasExpenseToday, missingMetrics, streakAtRisk, workoutPending })
}
