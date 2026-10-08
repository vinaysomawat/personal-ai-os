'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { todayIST, todayISTLabel } from '@/lib/date'

// Deterministic — no AI. Highest-spend category first; shows the budget
// alongside actual spend wherever one's been set for the category.
function formatExpensesByCategory(expenses: { amount: number; category: string }[], budgets: { amount: number; category: string }[], monthSpend: number): string {
  if (expenses.length === 0) return ''

  const budgetByCategory = new Map(budgets.map(b => [b.category, Number(b.amount ?? 0)]))
  const totalsByCategory = new Map<string, number>()
  for (const e of expenses) {
    totalsByCategory.set(e.category, (totalsByCategory.get(e.category) ?? 0) + Number(e.amount ?? 0))
  }

  const lines = [...totalsByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, spent]) => {
      const budget = budgetByCategory.get(cat)
      const spentStr = `₹${Math.round(spent).toLocaleString('en-IN')}`
      return budget ? `• ${cat}: ${spentStr} of ₹${Math.round(budget).toLocaleString('en-IN')}` : `• ${cat}: ${spentStr}`
    })

  return `\n\n💸 *Expenses this month (₹${Math.round(monthSpend).toLocaleString('en-IN')} total):*\n${lines.join('\n')}`
}

export interface DailyBriefing {
  // Full formatted message (score line + AI paragraph + expense section) — what Telegram sends.
  text: string
  // Just the AI-written paragraph — what the Executive Dashboard's Morning Brief persists and shows,
  // without re-showing the expense section the Dashboard already surfaces elsewhere.
  message: string
}

// Shared by the daily-briefing cron job and the on-demand Telegram "briefing"
// action, so both surfaces compute and word the briefing identically.
export async function generateDailyBriefing(db: SupabaseClient, userId: string): Promise<DailyBriefing> {
  const today = todayIST()
  const monthStart = today.slice(0, 7) + '-01'

  const [
    expensesRes, budgetsRes,
    appsRes, scoreRes,
  ] = await Promise.all([
    db.from('expenses').select('amount, category').eq('user_id', userId).gte('date', monthStart),
    db.from('budgets').select('amount, category').eq('user_id', userId).eq('month', today.slice(0, 7)),
    db.from('applications').select('status').eq('user_id', userId),
    db.from('life_score_logs').select('life_score').eq('user_id', userId).order('date', { ascending: false }).limit(2),
  ])

  const expenses = expensesRes.data ?? []
  const budgets = budgetsRes.data ?? []
  const monthSpend = expenses.reduce((s: number, e: { amount: number }) => s + (e.amount ?? 0), 0)
  const monthBudget = budgets.reduce((s: number, b: { amount: number }) => s + (b.amount ?? 0), 0)
  const apps = appsRes.data ?? []
  const scores = scoreRes.data ?? []

  const lifeScore = scores[0]?.life_score ?? 0
  const prevScore = scores[1]?.life_score ?? null
  const delta = prevScore !== null ? lifeScore - prevScore : null

  const activeApps = apps.filter((a: { status: string }) => ['screening', 'interview'].includes(a.status)).length

  const prompt = `Morning briefing for Vinay. Today: ${todayISTLabel()}.

Life Score: ${lifeScore}/100${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta} from yesterday)` : ''}
Budget: ₹${Math.round(monthSpend).toLocaleString('en-IN')} of ₹${Math.round(monthBudget).toLocaleString('en-IN')} this month
Active interview processes: ${activeApps}

Write a short morning briefing (max 120 words):
1. One motivating sentence about the Life Score
2. The single most important action for today
3. One thing to be proud of or watch out for

Keep it direct, personal, and energetic. No bullet points — flowing text.`

  const message = await askAI('daily_briefing', prompt, 'You are Vinay\'s personal AI coach. Write like a coach texting a friend. Warm but direct.', { userId })

  const trendEmoji = delta === null ? '' : delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️'
  const scoreLine = `*Life Score: ${lifeScore}/100* ${trendEmoji}${delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta})` : ''}`

  const expenseSection = formatExpensesByCategory(expenses, budgets, monthSpend)

  return { text: `${scoreLine}\n\n${message}${expenseSection}`, message }
}
