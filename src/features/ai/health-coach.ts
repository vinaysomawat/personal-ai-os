'use server'

import { askAI } from '@/lib/ai-gateway'
import type { HealthMetric, HealthProfile } from '@/features/health/types'

// Health Coach free-form Q&A (the Health bot's "ask"). The weekly report and
// AI daily plan were removed 2026-10-10.
export async function askHealthCoach(question: string, profile: HealthProfile | null, recentMetrics: HealthMetric[]): Promise<string> {
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null
  const withWeight = recentMetrics.filter(m => m.weight_kg !== null)
  const weightTrend = withWeight.length >= 2
    ? (withWeight[withWeight.length - 1].weight_kg! - withWeight[0].weight_kg!).toFixed(1)
    : null

  const context = `Vinay's health snapshot (last ${recentMetrics.length} days logged):
- Age/gender/height: ${profile?.age ?? '?'} / ${profile?.gender ?? '?'} / ${profile?.height_cm ?? '?'}cm
- Activity level: ${profile?.activity_level ?? 'not set'}
- Current weight: ${withWeight.at(-1)?.weight_kg ?? 'not logged'}kg${weightTrend ? ` (${Number(weightTrend) > 0 ? '+' : ''}${weightTrend}kg over this window)` : ''}
- Avg calories: ${avg(recentMetrics.filter(m => m.calories !== null).map(m => m.calories!)) ?? 'not logged'} kcal/day
- Avg protein: ${avg(recentMetrics.filter(m => m.protein_g !== null).map(m => m.protein_g!)) ?? 'not logged'}g/day
- Avg steps: ${avg(recentMetrics.filter(m => m.steps !== null).map(m => m.steps!)) ?? 'not logged'}/day

Question: ${question}`

  return askAI('health_advisor', context, "You are Vinay's personal fitness and nutrition coach. Give sharp, specific, numbers-driven advice tailored to his exact situation. Reference his actual metrics — no generic tips. Under 150 words.")
}
