'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { daysAgoIST } from '@/lib/date'
import { computeScoreStats, computeCategoryTotals } from './score-stats'

// Deterministic — no AI. Highest-spend category first.
function formatSpend(expenses: { amount: number; category: string }[], periodLabel: string): string {
  if (expenses.length === 0) return ''

  const totals = computeCategoryTotals(expenses)
  const total = totals.reduce((sum, [, amt]) => sum + amt, 0)
  const lines = totals.map(([cat, spent]) => `• ${cat}: ₹${Math.round(spent).toLocaleString('en-IN')}`)

  return `\n\n💸 *This ${periodLabel}'s spend (₹${Math.round(total).toLocaleString('en-IN')} total):*\n${lines.join('\n')}`
}

// Shared core for both the weekly and monthly digests — same aggregation and
// wording, just a different lookback window. Used by both the cron jobs and
// the on-demand Telegram "digest" action, so every surface agrees.
async function generateDigest(
  db: SupabaseClient, userId: string, days: number, periodLabel: string, task: 'weekly_digest' | 'monthly_digest'
): Promise<string> {
  const since = daysAgoIST(days)

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

  const { avgLife, moduleAvgs, best, worst, topModule, weakModule } = computeScoreStats(logs)

  const prompt = `${periodLabel[0].toUpperCase()}${periodLabel.slice(1)}ly life score summary for Vinay:
Days tracked: ${logs.length}/${days}
Average Life Score: ${avgLife}/100
Best day: ${best.date} (${best.score}/100)
Worst day: ${worst.date} (${worst.score}/100)
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
    `Best: ${best.score} (${best.date}) · Worst: ${worst.score} (${worst.date})\n\n` +
    `Health   ${scoreBar(moduleAvgs.Health)} ${moduleAvgs.Health}\n` +
    `Finance  ${scoreBar(moduleAvgs.Finance)} ${moduleAvgs.Finance}\n` +
    `Career   ${scoreBar(moduleAvgs.Career)} ${moduleAvgs.Career}\n` +
    `Projects ${scoreBar(moduleAvgs.Projects)} ${moduleAvgs.Projects}\n\n` +
    `${message}${spendSection}`
}

export async function generateWeeklyDigest(db: SupabaseClient, userId: string): Promise<string> {
  return generateDigest(db, userId, 7, 'week', 'weekly_digest')
}

export async function generateMonthlyDigest(db: SupabaseClient, userId: string): Promise<string> {
  return generateDigest(db, userId, 30, 'month', 'monthly_digest')
}
