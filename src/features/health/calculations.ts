import type { ActivityLevel, Gender, HealthMetric, Workout, HealthProfile } from './types'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const MIN_SAFE_CALORIES = 1500
const KCAL_PER_KG_FAT = 7700
const NORMAL_BMI_UPPER = 24.9

function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

// Upper bound of the "normal" BMI range (18.5–24.9) — the most achievable
// real target for someone starting overweight/obese, used as the fitness
// goal weight instead of requiring a manually-entered target weight.
function calculateNormalBmiWeight(heightCm: number): number {
  const heightM = heightCm / 100
  return NORMAL_BMI_UPPER * heightM * heightM
}

function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return gender === 'male' ? base + 5 : base - 161
}

function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIER[activityLevel]
}

export interface DailyTargets {
  dailyCalorieTarget: number
  proteinTargetG: number
  carbsG: number
  fatG: number
  bmi: number
  normalBmiWeightKg: number
  weeklyLossKg: number
}

// Fitness-oriented targets, not pure maintenance: if current weight puts BMI
// above the normal range (18.5–24.9), calorie target is a modest deficit
// toward the upper-normal-BMI weight (auto-computed from height — no manual
// target weight or deadline needed). Once BMI is back in the normal range,
// this naturally becomes a maintenance target.
function calculateDailyTargets(currentWeightKg: number, heightCm: number, tdee: number): DailyTargets {
  const bmi = calculateBMI(currentWeightKg, heightCm)
  const normalBmiWeightKg = calculateNormalBmiWeight(heightCm)
  const weightToLoseKg = Math.max(0, currentWeightKg - normalBmiWeightKg)

  // Sustainable pace: 0.4-1kg/week, scaled to how much is left to lose.
  const weeklyLossKg = weightToLoseKg > 0 ? Math.min(1, Math.max(0.4, weightToLoseKg * 0.01 * 7)) : 0
  const dailyDeficit = (weeklyLossKg * KCAL_PER_KG_FAT) / 7
  const dailyCalorieTarget = Math.max(MIN_SAFE_CALORIES, Math.round(tdee - dailyDeficit))

  // Protein is based on the target (normal-BMI) weight while cutting, not
  // current scale weight — 2g/kg of an overweight starting weight overshoots
  // real need; standard fat-loss guidance anchors protein to lean/goal weight.
  const proteinBaseWeightKg = weightToLoseKg > 0 ? normalBmiWeightKg : currentWeightKg
  const proteinTargetG = Math.round(proteinBaseWeightKg * 2.0)
  const fatG = Math.round((dailyCalorieTarget * 0.25) / 9)
  const carbsG = Math.max(0, Math.round((dailyCalorieTarget - proteinTargetG * 4 - fatG * 9) / 4))

  return {
    dailyCalorieTarget, proteinTargetG, carbsG, fatG,
    bmi: Math.round(bmi * 10) / 10,
    normalBmiWeightKg: Math.round(normalBmiWeightKg * 10) / 10,
    weeklyLossKg: Math.round(weeklyLossKg * 100) / 100,
  }
}

interface SubScore {
  score: number
  reason: string
}

export interface HealthScoreBreakdown {
  overall: number
  nutrition: SubScore
  activity: SubScore
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n))
}

function calculateHealthScore(
  todayMetric: HealthMetric | null,
  targets: { calories: number; protein: number; steps: number },
  workouts: Workout[],
  today: string
): HealthScoreBreakdown {
  // Nutrition
  let nutritionScore: number
  let nutritionReason: string
  if (todayMetric?.calories == null && todayMetric?.protein_g == null) {
    nutritionScore = 0
    nutritionReason = 'Nothing logged today — log calories and protein to see this score'
  } else {
    const calLogged = todayMetric?.calories != null
    const proteinLogged = todayMetric?.protein_g != null
    const calDelta = calLogged ? Math.abs(todayMetric!.calories! - targets.calories) / targets.calories : 0.5
    const calScore = clamp(100 - calDelta * 150)
    const proteinScore = proteinLogged ? clamp((todayMetric!.protein_g! / targets.protein) * 100) : 40
    nutritionScore = Math.round((calScore + proteinScore) / 2)

    // Whichever of calories/protein is actually worse today drives the
    // reason message — previously this always favored protein regardless
    // of which one was further off target, so a real calorie miss never
    // showed even when it was the bigger problem (protein's target is high
    // enough that its gap was almost always >20g, permanently winning).
    const proteinGap = Math.round(targets.protein - (todayMetric?.protein_g ?? 0))
    const calOffPct = Math.round(calDelta * 100)
    const calIssue = !calLogged ? 'Calories aren\'t logged yet today' : calDelta > 0.15 ? `Calories are ${calOffPct}% off target` : null
    const proteinIssue = !proteinLogged ? 'Protein isn\'t logged yet today' : proteinGap > 20 ? `Protein is ${proteinGap}g below target` : null

    nutritionReason = calIssue && proteinIssue
      ? (calScore <= proteinScore ? calIssue : proteinIssue)
      : calIssue ?? proteinIssue ?? 'On track with today\'s nutrition targets'
  }

  // Activity
  let activityScore: number
  let activityReason: string
  const workoutDoneToday = workouts.some(w => w.date === today)
  if (todayMetric?.steps == null) {
    activityScore = workoutDoneToday ? 50 : 0
    activityReason = workoutDoneToday ? 'Workout logged, but steps not tracked today' : 'Steps and workout not logged today'
  } else {
    const stepScore = clamp((todayMetric.steps / targets.steps) * 100)
    activityScore = Math.round(workoutDoneToday ? Math.min(100, stepScore + 15) : stepScore)
    activityReason = todayMetric.steps < targets.steps
      ? `${targets.steps - todayMetric.steps} steps short of today's ${targets.steps} target`
      : `Hit today's ${targets.steps} step target`
  }

  const overall = Math.round(
    nutritionScore * 0.6 + activityScore * 0.4
  )

  return {
    overall,
    nutrition: { score: nutritionScore, reason: nutritionReason },
    activity: { score: activityScore, reason: activityReason },
  }
}

export interface HealthPlanResult {
  dailyTargets: DailyTargets
  healthScore: HealthScoreBreakdown
}

// Shared by the web app (HealthView) and the Telegram health bot — the single
// place "can we compute today's plan" and "what's today's score" are decided,
// so both surfaces stay in sync.
export function computeHealthPlan(
  profile: HealthProfile | null,
  metrics: HealthMetric[],
  workouts: Workout[],
  today: string
): HealthPlanResult | null {
  const todayMetric = metrics.find(m => m.date === today) ?? null
  const latestWeight = todayMetric?.weight_kg
    ?? [...metrics].filter(m => m.weight_kg !== null).sort((a, b) => b.date.localeCompare(a.date))[0]?.weight_kg
    ?? null

  const canCalculate = !!profile && profile.age && profile.gender && profile.height_cm && profile.activity_level && latestWeight
  if (!canCalculate) return null

  const dailyTargets = calculateDailyTargets(
    latestWeight!,
    profile!.height_cm!,
    calculateTDEE(calculateBMR(latestWeight!, profile!.height_cm!, profile!.age!, profile!.gender!), profile!.activity_level!),
  )

  const healthScore = calculateHealthScore(
    todayMetric,
    { calories: dailyTargets.dailyCalorieTarget, protein: dailyTargets.proteinTargetG, steps: 10000 },
    workouts,
    today
  )

  return { dailyTargets, healthScore }
}
