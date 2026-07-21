import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateDailyJournal, saveDailyJournal } from '@/features/ai/daily-journal'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'

const CHAT_ID   = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'daily-journal')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const paragraph = await generateDailyJournal(supabase, user.id)
  await saveDailyJournal(supabase, user.id, paragraph)

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `📔 *Today's Journal*\n\n${paragraph}`)

  return NextResponse.json({ ok: true })
}
