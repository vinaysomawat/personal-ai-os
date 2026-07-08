'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'

// Shared by the daily-briefing cron job and the on-demand Telegram "briefing"
// action, so both surfaces compute and word the briefing identically.
export async function generateDailyBriefing(db: SupabaseClient, userId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [
    habitsRes, logsRes, expensesRes, budgetsRes, resourcesRes,
    appsRes, projectsRes, scoreRes,
  ] = await Promise.all([
    db.from('habits').select('id').eq('user_id', userId),
    db.from('habit_logs').select('habit_id').eq('user_id', userId).eq('date', today),
    db.from('expenses').select('amount').eq('user_id', userId).gte('date', monthStart),
    db.from('budgets').select('amount').eq('user_id', userId).eq('month', today.slice(0, 7)),
    db.from('resources').select('status').eq('user_id', userId),
    db.from('applications').select('status').eq('user_id', userId),
    db.from('projects').select('status').eq('user_id', userId),
    db.from('life_score_logs').select('life_score').eq('user_id', userId).order('date', { ascending: false }).limit(2),
  ])

  const habits = habitsRes.data ?? []
  const todayLogs = logsRes.data ?? []
  const monthSpend = (expensesRes.data ?? []).reduce((s: number, e: { amount: number }) => s + (e.amount ?? 0), 0)
  const monthBudget = (budgetsRes.data ?? []).reduce((s: number, b: { amount: number }) => s + (b.amount ?? 0), 0)
  const resources = resourcesRes.data ?? []
  const apps = appsRes.data ?? []
  const projects = projectsRes.data ?? []
  const scores = scoreRes.data ?? []

  const lifeScore = scores[0]?.life_score ?? 0
  const prevScore = scores[1]?.life_score ?? null
  const delta = prevScore !== null ? lifeScore - prevScore : null

  const activeApps = apps.filter((a: { status: string }) => ['applied', 'screening', 'interview'].includes(a.status)).length
  const inProgress = resources.filter((r: { status: string }) => r.status === 'in-progress').length

  const prompt = `Morning briefing for Vinay. Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.

Life Score: ${lifeScore}/100${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta} from yesterday)` : ''}
Habits done: ${todayLogs.length}/${habits.length}
Budget: ₹${Math.round(monthSpend).toLocaleString('en-IN')} of ₹${Math.round(monthBudget).toLocaleString('en-IN')} this month
Active applications: ${activeApps}
Learning in progress: ${inProgress} resources
Active projects: ${projects.filter((p: { status: string }) => p.status === 'in-progress').length}

Write a short morning briefing (max 120 words):
1. One motivating sentence about the Life Score
2. The single most important action for today
3. One thing to be proud of or watch out for

Keep it direct, personal, and energetic. No bullet points — flowing text.`

  const message = await askAI('daily_briefing', prompt, 'You are Vinay\'s personal AI coach. Write like a coach texting a friend. Warm but direct.', { userId })

  const trendEmoji = delta === null ? '' : delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️'
  const scoreLine = `*Life Score: ${lifeScore}/100* ${trendEmoji}${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta})` : ''}`

  return `${scoreLine}\n\n${message}`
}
