import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { coachData, middayMessage } from '@/features/prep/coach'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Prep Coach, 1pm IST: only messages when ≥30 min behind the day's pace.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  await logCronRun(supabase, 'prep-coach-midday')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })
  const data = await coachData(supabase, user.id)
  if (!data) return NextResponse.json({ ok: true, sent: false, reason: 'Interview War Mode off' })
  const text = middayMessage(data)
  if (!text) return NextResponse.json({ ok: true, sent: false, reason: 'On pace' })
  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)
  return NextResponse.json({ ok: true, sent: true })
}
