import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { getReminderLines } from '@/lib/reminders'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Morning reminders, 9:00am IST (Daily bot). Reminders only — the Prep coach
// messages are off; silent when there are none.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  await logCronRun(supabase, 'reminders-morning')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })
  const text = (await getReminderLines(supabase, user.id, 'morning')).trim()
  if (!text) return NextResponse.json({ ok: true, sent: false, reason: 'No reminders' })
  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)
  return NextResponse.json({ ok: true, sent: true })
}
