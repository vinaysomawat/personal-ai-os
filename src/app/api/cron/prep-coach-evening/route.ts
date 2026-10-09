import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { getReminderLines } from '@/lib/reminders'
import { todayIST } from '@/lib/date'
import { coachData, eveningMessage, stillOpenLine } from '@/features/prep/coach'
import { generateForecast } from '@/features/prep/forecast'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Prep Coach, 9:30pm IST: the day's review, a "Still open:" line (expenses,
// open workout, stale health metrics — absorbed from the old evening
// check-in) and evening reminders. On Sundays (IST) it also generates the
// weekly "if you interviewed tomorrow" forecast (one AI call). With Job Hunt
// Mode off it still sends when reminders or open items exist.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  await logCronRun(supabase, 'prep-coach-evening')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })
  const [data, reminders, open] = await Promise.all([
    coachData(supabase, user.id), getReminderLines(supabase, user.id, 'evening'), stillOpenLine(supabase, user.id, todayIST()),
  ])
  if (!data) {
    const text = [open, reminders.trim()].filter(Boolean).join('\n\n')
    if (!text) return NextResponse.json({ ok: true, sent: false, reason: 'Job Hunt Mode off, nothing open' })
    await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)
    return NextResponse.json({ ok: true, sent: true, hunt: false })
  }
  let text = `${eveningMessage(data)}${open ? `\n\n${open}` : ''}${reminders}`
  const sunday = new Date(`${data.today}T00:00:00Z`).getUTCDay() === 0
  if (sunday) {
    const { forecast } = await generateForecast(supabase, user.id)
    if (forecast) {
      text += `\n\n🔮 *If you interviewed tomorrow* (confidence ${forecast.confidence}%)\n` +
        (forecast.failures.length ? forecast.failures.map(f => `✗ *${f.area}* — ${f.why}`).join('\n') : '') +
        (forecast.riskQuestion ? `\n\nHighest-risk question: “${forecast.riskQuestion}”` : '') +
        (forecast.fixFirst.length ? `\n\nFix first:\n${forecast.fixFirst.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : '')
    }
  }
  await sendMessage(BOT_TOKEN, Number(CHAT_ID), text)
  return NextResponse.json({ ok: true, sent: true, forecast: sunday })
}
