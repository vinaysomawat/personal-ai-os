'use server'

import { aiText } from '@/lib/anthropic'
import type { HealthMetric } from '@/features/health/types'

export async function getHealthReport(metrics: HealthMetric[]): Promise<string> {
  if (metrics.length === 0) return 'No health data yet. Start logging your metrics daily and I can analyse your trends.'

  const withWeight  = metrics.filter(m => m.weight_kg !== null)
  const withSleep   = metrics.filter(m => m.sleep_hours !== null)
  const withCalories = metrics.filter(m => m.calories !== null)
  const withProtein  = metrics.filter(m => m.protein_g !== null)
  const withSteps    = metrics.filter(m => m.steps !== null)

  const avg = (arr: number[]) => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : 'N/A'

  const weightTrend = withWeight.length >= 2
    ? (withWeight[0].weight_kg! - withWeight[withWeight.length - 1].weight_kg!).toFixed(1)
    : null

  const prompt = `Weekly health data for Vinay (last ${metrics.length} days logged):

Weight:  ${withWeight.map(m => `${m.date}: ${m.weight_kg}kg`).join(', ') || 'not logged'}
${weightTrend ? `Weight change: ${Number(weightTrend) > 0 ? '+' : ''}${weightTrend}kg over the period` : ''}

Sleep:    avg ${avg(withSleep.map(m => m.sleep_hours!))} hrs/night
Calories: avg ${avg(withCalories.map(m => m.calories!))} kcal/day
Protein:  avg ${avg(withProtein.map(m => m.protein_g!))} g/day
Steps:    avg ${avg(withSteps.map(m => m.steps!))} steps/day
Water:    avg ${metrics.filter(m=>m.water_ml).length ? avg(metrics.filter(m=>m.water_ml).map(m=>m.water_ml!)) : 'N/A'} ml/day

Write a weekly health report with:
1. A one-line overall summary (include a score /10)
2. What's going well (2-3 bullets)
3. What needs improvement (2-3 bullets)
4. 3 specific, actionable recommendations for next week

Be encouraging but direct. Reference actual numbers. Keep it under 200 words.`

  return aiText(prompt, "You are Vinay's personal health coach. Give sharp, data-driven feedback. No generic advice — reference his specific numbers.")
}
