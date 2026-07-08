import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateDailyBriefing } from '@/features/ai/daily-briefing'
import { getReminderLines } from '@/lib/reminders'
import { sendMessage } from '@/lib/telegram/send'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch the first user (single-user app)
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const body = await generateDailyBriefing(supabase, user.id)
  const reminders = await getReminderLines(supabase, user.id, 'morning')

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `🌅 *Good Morning, Vinay!*\n\n${body}${reminders}\n\n_Open your dashboard → vinay-ai-os.vercel.app_`)

  return NextResponse.json({ ok: true })
}
