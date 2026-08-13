import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { getAstrologyReading } from '@/features/astrology/actions'
import { getTodaysPanchang } from '@/features/astrology/panchang-actions'
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
    getAstrologyReading(profile as AstrologyProfile, 'daily'),
  ])

  let text = `🔮 *Today's Astrology*\n\n`
  if (panchang) {
    text += `Tithi: ${panchang.tithi} (${panchang.paksha} Paksha) · Nakshatra: ${panchang.nakshatra}\nSunrise: ${panchang.sunrise} · Sunset: ${panchang.sunset}\n⚠️ Rahu Kalam: ${panchang.rahu_kalam_start}–${panchang.rahu_kalam_end}\n\n`
  }
  text += reading

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)

  return NextResponse.json({ ok: true, notified: true })
}
