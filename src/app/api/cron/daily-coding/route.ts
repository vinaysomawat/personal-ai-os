import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { generateAssignmentForUser } from '@/features/coding/daily-core'
import { getDailyTip } from '@/lib/daily-tip'
import { logCronRun } from '@/lib/cron-log'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_CODING!

const DIFFICULTY_EMOJI: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🔴' }

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'daily-coding')
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const { data: settings } = await supabase.from('coding_settings').select('telegram_notify').eq('user_id', user.id).single()
  if (settings?.telegram_notify === false) {
    return NextResponse.json({ ok: true, notified: false })
  }

  const [assignment, tip] = await Promise.all([
    generateAssignmentForUser(supabase, user.id),
    getDailyTip(supabase, user.id, 'coding'),
  ])
  const tipSection = tip ? `\n\n💡 *Tip of the day:*\n${tip}` : ''

  if (assignment.length === 0) {
    // Revision day (or an exhausted pool) — still send something, so silence
    // never reads as "did the alert fail?". Nudge toward unfinished questions.
    const { data: incomplete } = await supabase
      .from('coding_daily_questions')
      .select('question:coding_questions(title, url, difficulty)')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('assigned_date', { ascending: false })
      .limit(3)

    const rows = (incomplete ?? []) as unknown as { question: { title: string; url: string; difficulty: string } }[]
    const body = rows.length > 0
      ? `Catch up on what's still open:\n\n${rows.map(r => `${DIFFICULTY_EMOJI[r.question.difficulty] ?? ''} *${r.question.title}*\n${r.question.url}`).join('\n\n')}`
      : `Nothing pending — review an old favorite or take the day off. 🎉`

    await sendMessage(BOT_TOKEN, Number(CHAT_ID), `🧘 *No new question today — revision day*\n\n${body}${tipSection}`)
    return NextResponse.json({ ok: true, notified: true, revisionDay: true })
  }

  const lines = assignment.map((a, i) => {
    const q = a.question
    return `${assignment.length > 1 ? `*Question ${i + 1}/${assignment.length}*\n` : ''}${DIFFICULTY_EMOJI[q.difficulty] ?? ''} *${q.title}*\nDifficulty: ${q.difficulty}\n[Open](${q.url})`
  })

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `💻 *Today's Coding Challenge*\n\n${lines.join('\n\n')}\n\n_Mark it done in AI OS or Telegram once solved._${tipSection}`)

  return NextResponse.json({ ok: true, notified: true, count: assignment.length })
}
