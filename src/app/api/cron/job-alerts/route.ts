import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { findNewJobAlerts } from '@/features/career/job-alerts'
import { logCronRun } from '@/lib/cron-log'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CAREER!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'job-alerts')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const newJobs = await findNewJobAlerts(supabase, user.id)
  if (newJobs.length === 0) {
    return NextResponse.json({ ok: true, notified: false })
  }

  // Cap at 10 in one message — a wall of 40 links defeats the purpose of an alert.
  const shown = newJobs.slice(0, 10)
  const lines = shown.map(j => `🏢 *${j.company}* — ${j.title}\n${j.url}`)
  const overflow = newJobs.length > shown.length ? `\n\n_+${newJobs.length - shown.length} more new posting(s) — check the companies directly._` : ''

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `💼 *New Frontend/Staff Openings*\n\n${lines.join('\n\n')}${overflow}`)

  return NextResponse.json({ ok: true, notified: true, count: newJobs.length })
}
