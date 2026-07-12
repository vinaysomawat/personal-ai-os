'use server'

import { askAI } from '@/lib/ai-gateway'
import type { HealthMetric, HealthProfile } from '@/features/health/types'
import type { DailyTargets, HealthScoreBreakdown } from '@/features/health/calculations'

export async function getHealthReport(metrics: HealthMetric[]): Promise<string> {
  if (metrics.length === 0) return 'No health data yet. Start logging your metrics daily and I can analyse your trends.'

  const withWeight  = metrics.filter(m => m.weight_kg !== null)
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

Calories: avg ${avg(withCalories.map(m => m.calories!))} kcal/day
Protein:  avg ${avg(withProtein.map(m => m.protein_g!))} g/day
Steps:    avg ${avg(withSteps.map(m => m.steps!))} steps/day

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
  const stepsLogged = todayMetric?.steps ?? 0

  const bmiNote = plan.weeklyLossKg > 0
    ? `His BMI is ${plan.bmi} (normal range tops out at 24.9, ~${plan.normalBmiWeightKg}kg at his height) — today's targets carry a modest ~${plan.weeklyLossKg}kg/week deficit toward that, not a crash diet.`
    : `His BMI is ${plan.bmi}, already in the normal range — today's targets are maintenance, not a deficit.`

  const prompt = `Vinay's daily health plan for today. His goal: get fit — a gradual, sustainable calorie deficit toward a normal BMI, not a crash diet or an arbitrary weight-loss deadline. ${bmiNote}

Today's targets: ${plan.dailyCalorieTarget} kcal, ${plan.proteinTargetG}g protein, ${plan.carbsG}g carbs, ${plan.fatG}g fat.

Logged so far today: calories=${todayMetric?.calories ?? 'not logged'}, protein=${todayMetric?.protein_g ?? 'not logged'}g, steps=${stepsLogged}.

Remaining today: ${caloriesLeft > 0 ? `${caloriesLeft} kcal left` : 'calorie budget used up'}, ${proteinLeft > 0 ? `${proteinLeft}g protein left` : 'protein target hit'}.

Health Score right now: ${score.overall}/100 (Nutrition ${score.nutrition.score} — ${score.nutrition.reason}; Activity ${score.activity.score} — ${score.activity.reason}).

Write today's action plan as a short checklist (5-7 lines, each starting with an emoji), covering what's left to eat and steps/workout. End with one sentence tying it back to steady progress toward a normal BMI. Be specific to the numbers above — no generic advice. Plain text only — no markdown (no **, no #, no bullet dashes). Keep it under 150 words.`

  return askAI('health_daily_plan', prompt, "You are Vinay's personal fitness and nutrition coach. Be specific, data-driven, and direct. Reference his actual numbers, not generic tips.")
}

export async function askHealthCoach(question: string, profile: HealthProfile | null, recentMetrics: HealthMetric[]): Promise<string> {
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null
  const withWeight = recentMetrics.filter(m => m.weight_kg !== null)
  const weightTrend = withWeight.length >= 2
    ? (withWeight[withWeight.length - 1].weight_kg! - withWeight[0].weight_kg!).toFixed(1)
    : null

  const context = `Vinay's health snapshot (last ${recentMetrics.length} days logged):
- Age/gender/height: ${profile?.age ?? '?'} / ${profile?.gender ?? '?'} / ${profile?.height_cm ?? '?'}cm
- Target weight: ${profile?.target_weight_kg ?? 'not set'}kg
- Activity level: ${profile?.activity_level ?? 'not set'}
- Current weight: ${withWeight.at(-1)?.weight_kg ?? 'not logged'}kg${weightTrend ? ` (${Number(weightTrend) > 0 ? '+' : ''}${weightTrend}kg over this window)` : ''}
- Avg calories: ${avg(recentMetrics.filter(m => m.calories !== null).map(m => m.calories!)) ?? 'not logged'} kcal/day
- Avg protein: ${avg(recentMetrics.filter(m => m.protein_g !== null).map(m => m.protein_g!)) ?? 'not logged'}g/day
- Avg sleep: ${avg(recentMetrics.filter(m => m.sleep_hours !== null).map(m => m.sleep_hours!)) ?? 'not logged'}hrs/day
- Avg steps: ${avg(recentMetrics.filter(m => m.steps !== null).map(m => m.steps!)) ?? 'not logged'}/day

Question: ${question}`

  return askAI('health_advisor', context, "You are Vinay's personal fitness and nutrition coach. Give sharp, specific, numbers-driven advice tailored to his exact situation. Reference his actual metrics — no generic tips. Under 150 words.")
}
