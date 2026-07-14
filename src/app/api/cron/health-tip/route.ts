import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { getDailyTip } from '@/lib/daily-tip'
import { logCronRun } from '@/lib/cron-log'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_HEALTH!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'health-tip')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const tip = await getDailyTip(supabase, user.id, 'health')
  if (!tip) return NextResponse.json({ ok: true, notified: false, message: 'No tips in the pool yet' })

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `💪 *Health Tip of the Day*\n\n${tip}`)

  return NextResponse.json({ ok: true, notified: true })
}
