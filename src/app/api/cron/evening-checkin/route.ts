import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const [habitsRes, logsRes, tasksRes, expensesRes, metricRes] = await Promise.all([
    supabase.from('habits').select('id, name, icon').eq('user_id', user.id),
    supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('date', today),
    supabase.from('tasks').select('text').eq('user_id', user.id).eq('done', false).eq('priority', 'high'),
    supabase.from('expenses').select('id').eq('user_id', user.id).eq('date', today).limit(1),
    supabase.from('health_metrics').select('weight_kg, calories, sleep_hours, steps').eq('user_id', user.id).eq('date', today).single(),
  ])

  const habits = habitsRes.data ?? []
  const doneToday = new Set((logsRes.data ?? []).map(l => l.habit_id))
  const pendingHabits = habits.filter(h => !doneToday.has(h.id))
  const highPriorityTasks = tasksRes.data ?? []
  const hasExpenseToday = (expensesRes.data ?? []).length > 0
  const metric = metricRes.data

  const missingMetrics: string[] = []
  if (!metric?.weight_kg) missingMetrics.push('weight')
  if (!metric?.sleep_hours) missingMetrics.push('sleep')
  if (!metric?.steps) missingMetrics.push('steps')
  if (!metric?.calories) missingMetrics.push('calories')

  const nothingPending = pendingHabits.length === 0 && highPriorityTasks.length === 0 && hasExpenseToday && missingMetrics.length === 0

  if (nothingPending) {
    return NextResponse.json({ ok: true, sent: false, reason: 'Everything already logged today' })
  }

  const lines: string[] = []
  if (pendingHabits.length > 0) {
    lines.push(`💪 *Habits not done:*\n${pendingHabits.map(h => `${h.icon} ${h.name}`).join('\n')}`)
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

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `🌙 *Evening Check-in*\n\n${lines.join('\n\n')}\n\n_Log these whenever you get a moment — I'll stop asking once everything's in._`)

  return NextResponse.json({ ok: true, sent: true, pendingHabits: pendingHabits.length, highPriorityTasks: highPriorityTasks.length, hasExpenseToday, missingMetrics })
}
