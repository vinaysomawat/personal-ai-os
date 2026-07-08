'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'

// Shared by the weekly-digest cron job and the on-demand Telegram "digest"
// action, so both surfaces compute and word the digest identically.
export async function generateWeeklyDigest(db: SupabaseClient, userId: string): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data: logs } = await db
    .from('life_score_logs')
    .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
    .eq('user_id', userId)
    .gte('date', weekAgo)
    .order('date', { ascending: true })

  if (!logs || logs.length === 0) {
    return 'No data logged this week. Open your dashboard and start tracking!'
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

  const message = await askAI('weekly_digest', prompt, 'You are Vinay\'s AI life coach giving a weekly review. Be honest, warm, and motivating.', { userId })

  const scoreBar = (score: number) => '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10))

  return `*Avg Life Score: ${avgLife}/100*\n` +
    `Best: ${best.life_score} (${best.date}) · Worst: ${worst.life_score} (${worst.date})\n\n` +
    `Health   ${scoreBar(avgHealth)} ${avgHealth}\n` +
    `Finance  ${scoreBar(avgFinance)} ${avgFinance}\n` +
    `Career   ${scoreBar(avgCareer)} ${avgCareer}\n` +
    `Learning ${scoreBar(avgLearning)} ${avgLearning}\n` +
    `Projects ${scoreBar(avgProjects)} ${avgProjects}\n\n` +
    `${message}`
}
