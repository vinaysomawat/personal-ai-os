'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'

// Deterministic — no AI. Highest-spend category first.
function formatSpend(expenses: { amount: number; category: string }[], periodLabel: string): string {
  if (expenses.length === 0) return ''

  const totalsByCategory = new Map<string, number>()
  let total = 0
  for (const e of expenses) {
    const amt = Number(e.amount ?? 0)
    total += amt
    totalsByCategory.set(e.category, (totalsByCategory.get(e.category) ?? 0) + amt)
  }

  const lines = [...totalsByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, spent]) => `• ${cat}: ₹${Math.round(spent).toLocaleString('en-IN')}`)

  return `\n\n💸 *This ${periodLabel}'s spend (₹${Math.round(total).toLocaleString('en-IN')} total):*\n${lines.join('\n')}`
}

// Shared core for both the weekly and monthly digests — same aggregation and
// wording, just a different lookback window. Used by both the cron jobs and
// the on-demand Telegram "digest" action, so every surface agrees.
async function generateDigest(
  db: SupabaseClient, userId: string, days: number, periodLabel: string, task: 'weekly_digest' | 'monthly_digest'
): Promise<string> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const [{ data: logs }, { data: expenses }] = await Promise.all([
    db.from('life_score_logs')
      .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true }),
    db.from('expenses').select('amount, category').eq('user_id', userId).gte('date', since),
  ])

  const spendSection = formatSpend(expenses ?? [], periodLabel)

  if (!logs || logs.length === 0) {
    return `No data logged this ${periodLabel}. Open your dashboard and start tracking!${spendSection}`
  }

  const avg = (key: string) => Math.round(logs.reduce((s: number, r: Record<string, unknown>) => s + (r[key] as number), 0) / logs.length)

  const avgLife     = avg('life_score')
  const avgHealth   = avg('health_score')
  const avgFinance  = avg('finance_score')
  const avgCareer   = avg('career_score')
  const avgLearning = avg('learning_score')
  const avgProjects = avg('projects_score')

  const best  = logs.reduce((a, b) => a.life_score > b.life_score ? a : b)
  const worst = logs.reduce((a, b) => a.life_score < b.life_score ? a : b)

  const moduleAvgs = { Health: avgHealth, Finance: avgFinance, Career: avgCareer, Learning: avgLearning, Projects: avgProjects }
  const topModule  = Object.entries(moduleAvgs).sort(([, a], [, b]) => b - a)[0]
  const weakModule = Object.entries(moduleAvgs).sort(([, a], [, b]) => a - b)[0]

  const prompt = `${periodLabel[0].toUpperCase()}${periodLabel.slice(1)}ly life score summary for Vinay:
Days tracked: ${logs.length}/${days}
Average Life Score: ${avgLife}/100
Best day: ${best.date} (${best.life_score}/100)
Worst day: ${worst.date} (${worst.life_score}/100)
Strongest module: ${topModule[0]} (avg ${topModule[1]})
Weakest module: ${weakModule[0]} (avg ${weakModule[1]})

Write a motivating 3-sentence ${periodLabel}ly digest:
1. Summarise how the ${periodLabel} went (reference actual numbers)
2. Call out the biggest win
3. One specific focus area for next ${periodLabel}

Keep it personal, direct, under 80 words.`

  const message = await askAI(task, prompt, `You are Vinay's AI life coach giving a ${periodLabel}ly review. Be honest, warm, and motivating.`, { userId })

  const scoreBar = (score: number) => '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10))

  return `*Avg Life Score: ${avgLife}/100*\n` +
    `Best: ${best.life_score} (${best.date}) · Worst: ${worst.life_score} (${worst.date})\n\n` +
    `Health   ${scoreBar(avgHealth)} ${avgHealth}\n` +
    `Finance  ${scoreBar(avgFinance)} ${avgFinance}\n` +
    `Career   ${scoreBar(avgCareer)} ${avgCareer}\n` +
    `Learning ${scoreBar(avgLearning)} ${avgLearning}\n` +
    `Projects ${scoreBar(avgProjects)} ${avgProjects}\n\n` +
    `${message}${spendSection}`
}

export async function generateWeeklyDigest(db: SupabaseClient, userId: string): Promise<string> {
  return generateDigest(db, userId, 7, 'week', 'weekly_digest')
}

export async function generateMonthlyDigest(db: SupabaseClient, userId: string): Promise<string> {
  return generateDigest(db, userId, 30, 'month', 'monthly_digest')
}
