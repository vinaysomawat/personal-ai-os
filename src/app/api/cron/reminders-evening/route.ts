import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { getReminderLines } from '@/lib/reminders'
import { todayIST } from '@/lib/date'
import { stillOpenLine } from '@/features/prep/coach'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Evening reminders, 9:30pm IST (the dinner break, Daily bot): a "Still open:"
// line (no expense today, an open workout, stale health metrics) plus
// evening reminders. Silent when there is nothing to say.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  await logCronRun(supabase, 'reminders-evening')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })
  const [open, reminders] = await Promise.all([stillOpenLine(supabase, user.id, todayIST()), getReminderLines(supabase, user.id, 'evening')])
  const text = [open, reminders.trim()].filter(Boolean).join('\n\n')
  if (!text) return NextResponse.json({ ok: true, sent: false, reason: 'Nothing open, no reminders' })
  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)
  return NextResponse.json({ ok: true, sent: true })
}
