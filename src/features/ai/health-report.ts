'use server'

import { askAI } from '@/lib/ai-gateway'
import type { HealthMetric, HealthProfile } from '@/features/health/types'
import type { DailyTargets, HealthScoreBreakdown } from '@/features/health/calculations'

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

  return askAI('health_report', prompt, "You are Vinay's personal health coach. Give sharp, data-driven feedback. No generic advice — reference his specific numbers.")
}

export async function getDailyHealthPlan(
  profile: HealthProfile,
  plan: DailyTargets,
  todayMetric: HealthMetric | null,
  score: HealthScoreBreakdown,
  today: string
): Promise<string> {
  const caloriesLeft = plan.dailyCalorieTarget - (todayMetric?.calories ?? 0)
  const proteinLeft = plan.proteinTargetG - (todayMetric?.protein_g ?? 0)
  const waterLeft = 3000 - (todayMetric?.water_ml ?? 0)
  const stepsLogged = todayMetric?.steps ?? 0

  const prompt = `Vinay's daily health plan for today. His goal: overall fitness — staying balanced across nutrition, activity, and sleep, not chasing a specific weight target.

Today's maintenance targets: ${plan.dailyCalorieTarget} kcal, ${plan.proteinTargetG}g protein, ${plan.carbsG}g carbs, ${plan.fatG}g fat.

Logged so far today: calories=${todayMetric?.calories ?? 'not logged'}, protein=${todayMetric?.protein_g ?? 'not logged'}g, steps=${stepsLogged}, water=${todayMetric?.water_ml ?? 'not logged'}ml, sleep last night=${todayMetric?.sleep_hours ?? 'not logged'}h.

Remaining today: ${caloriesLeft > 0 ? `${caloriesLeft} kcal left` : 'calorie budget used up'}, ${proteinLeft > 0 ? `${proteinLeft}g protein left` : 'protein target hit'}, ${waterLeft > 0 ? `${waterLeft}ml water left` : 'water target hit'}.

Health Score right now: ${score.overall}/100 (Nutrition ${score.nutrition.score} — ${score.nutrition.reason}; Sleep ${score.sleep.score} — ${score.sleep.reason}; Activity ${score.activity.score} — ${score.activity.reason}).

Write today's action plan as a short checklist (6-8 lines, each starting with an emoji), covering what's left to eat, water, steps/workout, and sleep timing. End with one sentence tying it back to overall fitness/consistency, not weight loss. Be specific to the numbers above — no generic advice. Plain text only — no markdown (no **, no #, no bullet dashes). Keep it under 150 words.`

  return askAI('health_daily_plan', prompt, "You are Vinay's personal fitness and nutrition coach. Be specific, data-driven, and direct. Reference his actual numbers, not generic tips.")
}
