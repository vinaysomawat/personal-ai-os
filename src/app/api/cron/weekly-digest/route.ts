import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { aiText } from '@/lib/anthropic'

const CHAT_ID   = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' }),
  })
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data: logs } = await supabase
    .from('life_score_logs')
    .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
    .eq('user_id', user.id)
    .gte('date', weekAgo)
    .order('date', { ascending: true })

  if (!logs || logs.length === 0) {
    await sendTelegram('📊 *Weekly Digest*\n\nNo data logged this week. Open your dashboard and start tracking!')
    return NextResponse.json({ ok: true })
  }

  const avg = (key: string) => Math.round(logs.reduce((s, r) => s + (r[key as keyof typeof r] as number), 0) / logs.length)

  const avgLife     = avg('life_score')
  const avgHealth   = avg('health_score')
  const avgFinance  = avg('finance_score')
  const avgCareer   = avg('career_score')
  const avgLearning = avg('learning_score')
  const avgProjects = avg('projects_score')

  const best  = logs.reduce((a, b) => a.life_score > b.life_score ? a : b)
  const worst = logs.reduce((a, b) => a.life_score < b.life_score ? a : b)

  const moduleAvgs = { Health: avgHealth, Finance: avgFinance, Career: avgCareer, Learning: avgLearning, Projects: avgProjects }
  const topModule  = Object.entries(moduleAvgs).sort(([,a],[,b]) => b - a)[0]
  const weakModule = Object.entries(moduleAvgs).sort(([,a],[,b]) => a - b)[0]

  const prompt = `Weekly life score summary for Vinay:
Days tracked: ${logs.length}/7
Average Life Score: ${avgLife}/100
Best day: ${best.date} (${best.life_score}/100)
Worst day: ${worst.date} (${worst.life_score}/100)
Strongest module: ${topModule[0]} (avg ${topModule[1]})
Weakest module: ${weakModule[0]} (avg ${weakModule[1]})

Write a motivating 3-sentence weekly digest:
1. Summarise how the week went (reference actual numbers)
2. Call out the biggest win
3. One specific focus area for next week

Keep it personal, direct, under 80 words.`

  const message = await aiText(prompt, 'You are Vinay\'s AI life coach giving a weekly review. Be honest, warm, and motivating.')

  const scoreBar = (score: number) => '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10))

  await sendTelegram(
    `📊 *Weekly Life Score Digest*\n\n` +
    `*Avg Life Score: ${avgLife}/100*\n` +
    `Best: ${best.life_score} (${best.date}) · Worst: ${worst.date} (${worst.date})\n\n` +
    `Health   ${scoreBar(avgHealth)} ${avgHealth}\n` +
    `Finance  ${scoreBar(avgFinance)} ${avgFinance}\n` +
    `Career   ${scoreBar(avgCareer)} ${avgCareer}\n` +
    `Learning ${scoreBar(avgLearning)} ${avgLearning}\n` +
    `Projects ${scoreBar(avgProjects)} ${avgProjects}\n\n` +
    `${message}`
  )

  return NextResponse.json({ ok: true, avgLife })
}
