import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { getReminderLines } from '@/lib/reminders'
import { coachData, morningMessage } from '@/features/prep/coach'
import { sendDebriefPrompts } from '@/features/prep/coach'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Prep Coach, 7:30am IST: today's War Mode mission (builds the day's plan if
// the app hasn't been opened yet) plus morning reminders. With Job Hunt
// Mode off it still sends a reminders-only message when any exist.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  await logCronRun(supabase, 'prep-coach-morning')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })
  // Debrief prompts (Career bot) go out whether or not Job Hunt Mode is on.
  const debriefs = await sendDebriefPrompts(supabase, user.id)
  const [data, reminders] = await Promise.all([coachData(supabase, user.id), getReminderLines(supabase, user.id, 'morning')])
  const text = data ? `${morningMessage(data)}${reminders}` : reminders.trim()
  if (!text) return NextResponse.json({ ok: true, sent: false, reason: 'Job Hunt Mode off, no reminders' })
  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)
  return NextResponse.json({ ok: true, sent: true, hunt: !!data, debriefs })
}
