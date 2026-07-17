import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { generateTrendingReadingForUser } from '@/features/trending/core'
import { logCronRun } from '@/lib/cron-log'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CODING!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'trending-reading')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const { data: settings } = await supabase.from('coding_settings').select('telegram_notify').eq('user_id', user.id).single()
  if (settings?.telegram_notify === false) {
    return NextResponse.json({ ok: true, notified: false })
  }

  const reading = await generateTrendingReadingForUser(supabase, user.id)
  if (!reading) {
    return NextResponse.json({ ok: true, notified: false, message: 'No system design article available today' })
  }

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `📰 *Daily Tech Read*\n\n${reading.title}\n${reading.source}\n${reading.url}\n\n_Mark it done in AI OS or Telegram once read._`)

  return NextResponse.json({ ok: true, notified: true })
}
