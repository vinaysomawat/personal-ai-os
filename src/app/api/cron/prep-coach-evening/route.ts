import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { coachData, eveningMessage } from '@/features/prep/coach'
import { generateForecast } from '@/features/prep/forecast'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

// Prep Coach, 9:30pm IST: the day's review. On Sundays (IST) it also
// generates the weekly "if you interviewed tomorrow" forecast (one AI call)
// and appends it.
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  await logCronRun(supabase, 'prep-coach-evening')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })
  const data = await coachData(supabase, user.id)
  if (!data) return NextResponse.json({ ok: true, sent: false, reason: 'Job Hunt Mode off' })
  let text = eveningMessage(data)
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
