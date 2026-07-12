import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateMonthlyDigest } from '@/features/ai/weekly-digest'
import { sendMessage } from '@/lib/telegram/send'

const CHAT_ID   = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Vercel Hobby only supports daily-granularity cron schedules, not monthly
// ones — this runs daily like the others but only actually sends on the 1st
// of the month (IST), same workaround the rest of the cron jobs would need
// for anything less frequent than daily.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  if (todayIST.getUTCDate() !== 1) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not the 1st of the month (IST)' })
  }

  const supabase = createServiceClient()
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const body = await generateMonthlyDigest(supabase, user.id)

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `📅 *Monthly Life Score Digest*\n\n${body}`)

  return NextResponse.json({ ok: true })
}
