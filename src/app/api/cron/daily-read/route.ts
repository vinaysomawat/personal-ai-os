import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { ensureDailyRead, getActiveDailyRead, isMarkedToday } from '@/features/learning/daily-read'
import { logCronRun } from '@/lib/cron-log'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_LEARNING!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'daily-read')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const { data: resources } = await supabase.from('resources').select('*').eq('user_id', user.id)
  const reading = await ensureDailyRead(supabase, user.id, resources ?? [])
  if (!reading) {
    // Carry-over: yesterday's (or older) pick is still unread, so no new one
    // was added — remind about that one instead of going silent.
    const carried = getActiveDailyRead(resources ?? [])
    if (carried && carried.status !== 'completed' && !isMarkedToday(carried)) {
      const since = new Date(carried.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })
      await sendMessage(BOT_TOKEN, Number(CHAT_ID), `📖 *Daily Read — still open from ${since}*\n\n${carried.title}${carried.url ? `\n${carried.url}` : ''}\n\n_A new one arrives once this is marked done._`)
      return NextResponse.json({ ok: true, notified: true, carriedOver: true })
    }
    return NextResponse.json({ ok: true, notified: false, message: 'No new daily read today (already picked, or nothing available)' })
  }

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `📖 *Daily Read*\n\n${reading.title}${reading.url ? `\n${reading.url}` : '\n_(no link for this one — search for it)_'}\n\n_Mark it done in AI OS or Telegram once read._`)

  return NextResponse.json({ ok: true, notified: true })
}
