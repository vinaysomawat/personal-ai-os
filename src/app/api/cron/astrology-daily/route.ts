import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { getStructuredDailyReading } from '@/features/astrology/actions'
import { getTodaysPanchang } from '@/features/astrology/panchang-actions'
import { formatPanchangLines, formatDailyReading } from '@/features/astrology/telegram-format'
import { nowISTHHMM } from '@/lib/date'
import { UI_HI } from '@/features/astrology/i18n/hi'
import type { AstrologyProfile } from '@/features/astrology/types'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_ASTROLOGY!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'astrology-daily')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const { data: profile } = await supabase.from('astrology_profile').select('*').eq('user_id', user.id).maybeSingle()
  if (!profile) return NextResponse.json({ ok: true, notified: false, message: 'No birth chart saved yet' })

  // Panchang read reuses the day's already-upserted panchang_daily row
  // (idempotent by date); the reading is the same astrology_reading AI
  // Gateway task the web app uses, so it's cached the same way.
  const [panchang, reading] = await Promise.all([
    getTodaysPanchang(profile.birth_lat, profile.birth_lng, profile.birth_timezone),
    getStructuredDailyReading(profile as AstrologyProfile, 'hi'),
  ])

  // Crisp bullet layout (telegram-format.ts) — was panchang lines followed
  // by the reading flattened into multi-paragraph prose.
  let text = `🔮 *${UI_HI.todayAstrology}*\n\n`
  if (panchang) text += `${formatPanchangLines(panchang, nowISTHHMM())}\n\n`
  text += formatDailyReading(reading)

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)

  return NextResponse.json({ ok: true, notified: true })
}
