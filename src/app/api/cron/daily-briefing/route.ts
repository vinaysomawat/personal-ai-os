import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateDailyBriefing } from '@/features/ai/daily-briefing'
import { getReminderLines } from '@/lib/reminders'
import { sendMessage } from '@/lib/telegram/send'
import { logCronRun } from '@/lib/cron-log'
import { todayIST } from '@/lib/date'
import { computeAutomationRules, computeRiskEngine, computeOpportunityEngine, IMPACT_EMOJI } from '@/features/brain/risk-opportunity-engine'

const CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID!
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN_PLANNER!

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  await logCronRun(supabase, 'daily-briefing')

  // Fetch the first user (single-user app)
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.[0]
  if (!user) return NextResponse.json({ error: 'No user' }, { status: 404 })

  const [briefing, reminders, automationRules, risks, opportunities] = await Promise.all([
    generateDailyBriefing(supabase, user.id),
    getReminderLines(supabase, user.id, 'morning'),
    computeAutomationRules(supabase, user.id),
    computeRiskEngine(supabase, user.id),
    computeOpportunityEngine(supabase, user.id),
  ])

  // Executive Dashboard's Morning Brief (Phase 4 PRD) — persisted so the
  // Dashboard can show it without a fresh AI call on every page load.
  await supabase.from('daily_briefings').upsert(
    { user_id: user.id, date: todayIST(), message: briefing.message },
    { onConflict: 'user_id,date' }
  )

  const automationSection = automationRules.length > 0 ? `\n\n${automationRules.join('\n\n')}` : ''
  const riskSection = risks.length > 0
    ? `\n\n⚠️ *Risks*\n\n${risks.map(r => `${IMPACT_EMOJI[r.impact]} ${r.text}\n   → ${r.action}`).join('\n\n')}`
    : ''
  const opportunitySection = opportunities.length > 0 ? `\n\n${opportunities.map(o => o.text).join('\n\n')}` : ''

  await sendMessage(BOT_TOKEN, Number(CHAT_ID), `🌅 *Good Morning, Vinay!*\n\n${briefing.text}${automationSection}${riskSection}${opportunitySection}${reminders}\n\n_Open your dashboard → vinay-ai-os.vercel.app_`)

  return NextResponse.json({ ok: true, automationRules: automationRules.length, risks: risks.length, opportunities: opportunities.length })
}
