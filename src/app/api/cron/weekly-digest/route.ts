import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateWeeklyDigest } from '@/features/ai/weekly-digest'
import { sendMessage } from '@/lib/telegram/send'

const CHAT_ID   = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const body = await generateWeeklyDigest(supabase, user.id)

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `📊 *Weekly Life Score Digest*\n\n${body}`)

  return NextResponse.json({ ok: true })
}
