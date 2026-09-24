'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { todayIST, daysAgoIST, istMidnightUtc, istDateStrToUtcMidnight, toISTDateStr } from '@/lib/date'
import { getTodayAssignmentRows, getStaleRevisionCount } from '@/features/coding/daily-core'
import { getActiveWorkout, computeWorkoutStats } from '@/features/health/workout-core'
import { computeHealthPlan } from '@/features/health/calculations'
import type { Workout } from '@/features/health/types'
import { rankSignals, type Signal } from '@/lib/signals'
import { checkOverdueTasks, checkHighPriorityPending } from '@/features/planner/signals'
import { checkInterviewStage, checkQuizNeedsRevision, checkQuizWeakArea, checkHighValueJobAlert } from '@/features/career/signals'
import { daysSinceLastQuiz, topWeakSubtopic } from '@/features/career/quiz-calculations'
import { checkBudget } from '@/features/finance/signals'
import { checkQuestionPending, checkStaleRevision, checkCodingWeakArea } from '@/features/coding/signals'
import { computeWeakAreas, type WeakArea } from '@/features/coding/daily-core'
import { getInsightsHistory } from '@/features/coding/daily'
import { checkWorkoutPending, checkNoMetricsToday } from '@/features/health/signals'
import { getActiveDailyRead } from '@/features/learning/daily-read'
import { computeTodayProgress } from './daily-progress'
import { getRecentPatterns, type RecentPattern } from '@/features/brain/signals'
import type { ScoreModule } from '@/features/brain/types'
import { getCurrentDasha } from '@/features/astrology/chart-calculations'
import type { NatalChart } from '@/features/astrology/types'
import { LIFE_SCORE_THRESHOLDS } from '@/lib/thresholds'

type ModuleBreakdown = { today: number; weeklyAvg: number; blended: number; delta: number | null }

export interface TopAction {
  // The originating Signal's id (e.g. 'finance.over_budget') — lets
  // buildPriorityItems drop a signal that a risk already covers.
  id?: string
  emoji: string
  text: string
  href: string
}

interface TopActionInput {
  today: string
  pendingTasks: { text: string; priority: string; due_date: string | null }[]
  applications: { status: string }[]
  monthSpend: number
  monthBudget: number
  todayMetric: Record<string, unknown> | null
  codingQuestionPending: boolean
  codingStaleRevisionCount: number
  daysSinceLastQuiz: number | null
  workoutPending: boolean
  codingWeakAreas: WeakArea[]
  careerTopWeakSubtopic: { subtopic: string; count: number } | null
  topJobAlert: { company: string; title: string } | null
}

// Deterministic ranking — no AI call. Per Product Principles (CLAUDE.md):
// "reduce decisions, don't just surface data" — surface the 3 highest-impact
// actions instead of a wall of stat cards. Each candidate comes from its own
// module's signals.ts (see src/lib/signals.ts) rather than being hand-rolled
// here, so new modules can plug into Today's Focus without touching this file.
function computeTopActions(input: TopActionInput): TopAction[] {
  const { today, pendingTasks, applications, monthSpend, monthBudget, todayMetric, codingQuestionPending, codingStaleRevisionCount, daysSinceLastQuiz, workoutPending, codingWeakAreas, careerTopWeakSubtopic, topJobAlert } = input

  const signals = [
    checkOverdueTasks(pendingTasks, today),
    checkInterviewStage(applications),
    checkBudget(monthSpend, monthBudget),
    checkHighPriorityPending(pendingTasks, today),
    checkQuestionPending(codingQuestionPending),
    checkWorkoutPending(workoutPending),
    checkNoMetricsToday(todayMetric),
    checkStaleRevision(codingStaleRevisionCount),
    checkQuizNeedsRevision(daysSinceLastQuiz),
    checkCodingWeakArea(codingWeakAreas),
    checkQuizWeakArea(careerTopWeakSubtopic),
    checkHighValueJobAlert(topJobAlert),
  ].filter((s): s is Signal => s !== null)

  return rankSignals(signals, 5).map(s => ({ id: s.id, emoji: s.emoji, text: s.message, href: s.href }))
}

export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = todayIST()
  const monthStart = today.slice(0, 7) + '-01'
  const since30 = daysAgoIST(30)

  if (!user) return {
    pendingTasks: [], recentApplications: [], botActivity: [],
    scores: { health: 0, finance: 50, career: 0, learning: 0, projects: 0, life: 0 },
    scoreTips: { health: '', finance: '', career: '', learning: '', projects: '' },
    scoreBreakdown: {
      health: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      finance: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      career: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      learning: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      projects: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
    } as Record<ScoreModule, ModuleBreakdown>,
    lifeDelta: null as number | null,
    todayHealth: null,
    scoreHistory: [] as { date: string; life: number; health: number; finance: number; career: number; learning: number; projects: number }[],
    stats: { pendingTaskCount: 0, overdueCount: 0, activeApplications: 0, workoutsToday: 0, monthSpend: 0, monthBudget: 0, learningInProgress: 0, codingSolved30d: 0, workoutStreak: 0 },
    codingQuestionPending: false,
    workoutCategory: null as string | null,
    aiBudget: { callsToday: 0, costTodayUsd: 0, callsMonth: 0, costMonthUsd: 0, cacheHitRateMonth: 0 },
    topActions: [] as TopAction[],
    todayProgress: { items: [], completed: 0, total: 0, score: 100 } as ReturnType<typeof computeTodayProgress>,
    careerMemory: { currentRole: null, currentCompany: null, targetRole: null, currentSalary: null, bio: null } as { currentRole: string | null; currentCompany: string | null; targetRole: string | null; currentSalary: number | null; bio: string | null },
    financialGoals: [] as { name: string; targetAmount: number; currentAmount: number; targetDate: string | null }[],
    recentPatterns: [] as RecentPattern[],
    astrology: null as { dashaLord: string; antardashaLord: string; tithi: string | null; nakshatra: string | null } | null,
  }

  const [
    tasksRes, appsRes, workoutsRes,
    expensesRes, budgetsRes, resourcesRes,
    botLogsRes, healthMetricRes, careerProfileRes, skillsRes,
    aiUsageMonthRes, codingTodayRows, activeWorkout, codingSolved30dRes,
    codingCompletionsRes, quizAttemptsRes, tasksDueTodayRes, workoutCompletedTodayRes,
    recentPatterns, financialGoalsRes, codingHistoryForWeakAreas,
    workoutStats, astrologyProfileRes, panchangTodayRes, topJobAlertsRes,
    healthProfileRes, healthMetricsHistoryRes, allApplicationsRes, jobAlerts30dRes,
    { data: historyData },
  ] = await Promise.all([
    supabase.from('tasks').select('id, text, done, priority, due_date').eq('user_id', user.id).eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('applications').select('id, company, role, status, applied_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('workouts').select('id').eq('user_id', user.id).eq('date', today),
    supabase.from('expenses').select('amount, date').eq('user_id', user.id).gte('date', monthStart),
    supabase.from('budgets').select('amount').eq('user_id', user.id).eq('month', today.slice(0, 7)),
    supabase.from('resources').select('id, status, notes, created_at, completed_at').eq('user_id', user.id),
    supabase.from('telegram_logs').select('module, message, response, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).eq('date', today).single(),
    supabase.from('career_profile').select('current_role, target_role, current_company, current_salary, bio').eq('user_id', user.id).single(),
    supabase.from('skills').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('ai_usage_logs').select('estimated_cost_usd, cache_hit, created_at').eq('user_id', user.id).gte('created_at', istDateStrToUtcMidnight(monthStart)),
    getTodayAssignmentRows(supabase, user.id),
    getActiveWorkout(supabase, user.id),
    supabase.from('coding_daily_questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true).gte('assigned_date', since30),
    supabase.from('coding_daily_questions').select('question_id, completed, completed_at').eq('user_id', user.id).eq('completed', true),
    supabase.from('quiz_attempts').select('created_at, weak_areas').eq('user_id', user.id),
    supabase.from('tasks').select('id, text, done').eq('user_id', user.id).eq('due_date', today),
    supabase.from('daily_workouts').select('id').eq('user_id', user.id).eq('status', 'completed').gte('completed_at', istMidnightUtc()).limit(1),
    getRecentPatterns(supabase, user.id),
    supabase.from('financial_goals').select('name, target_amount, current_amount, target_date').eq('user_id', user.id).order('priority', { ascending: true }),
    getInsightsHistory(),
    computeWorkoutStats(supabase, user.id),
    // Astrology strip (3.4): reuses the already-computed natal_chart jsonb
    // (dasha math is pure/deterministic, no ephemeris recompute) and today's
    // already-cached panchang_daily row — no new AI/ephemeris cost added.
    supabase.from('astrology_profile').select('natal_chart').eq('user_id', user.id).maybeSingle(),
    supabase.from('panchang_daily').select('tithi, nakshatra').eq('date', today).maybeSingle(),
    // Top Job Alert signal below: best-scoring ("Top Fit", see job-alerts.ts's
    // deterministic computeScore) new posting from the last 30 days.
    supabase.from('job_alerts_seen').select('company, title').eq('user_id', user.id).gte('created_at', istMidnightUtc(30)).gte('score', 70).order('score', { ascending: false }).limit(5),
    // Life Score v2's Health sub-score reuses the Health module's own
    // nutrition/activity calc instead of a separate presence-only formula —
    // needs the profile (for targets) and enough metric history for the
    // same-day-or-most-recent weight lookback computeHealthPlan does.
    supabase.from('health_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).gte('date', since30).order('date', { ascending: false }),
    // Unlimited (unlike appsRes above, capped at 5 recent) — needed to
    // reliably detect a job-alert-to-application conversion from any point
    // in the last 30 days, not just the 5 most recently added applications.
    supabase.from('applications').select('company').eq('user_id', user.id),
    supabase.from('job_alerts_seen').select('company').eq('user_id', user.id).gte('created_at', istMidnightUtc(30)),
    // Life-score history for the v2 blend below — independent of every
    // other query, so it runs in this same batch (was a separate sequential
    // round-trip after it, ~600ms).
    supabase.from('life_score_logs')
      .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
      .eq('user_id', user.id).gte('date', daysAgoIST(30)).order('date', { ascending: true }),
  ])

  const pendingTasks = tasksRes.data ?? []
  const applications = appsRes.data ?? []
  const workoutsToday = workoutsRes.data ?? []
  const expenses = expensesRes.data ?? []
  const budgets = budgetsRes.data ?? []
  const resources = resourcesRes.data ?? []
  const todayMetric = healthMetricRes.data ?? null
  const todayDailyRead = getActiveDailyRead(resources)
  const todayDailyReadStatus = todayDailyRead ? { completed: todayDailyRead.status === 'completed' } : null

  const activeApps = applications.filter(a => ['applied', 'screening', 'interview'].includes(a.status)).length
  const monthSpend = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const monthBudget = budgets.reduce((s, b) => s + (b.amount ?? 0), 0)
  const learningInProgress = resources.filter(r => r.status === 'in-progress').length

  // --- Scores (Life Score v2, 2026-08-23) ---
  // Each of these is today's fresh "daily raw" score — the quality-aware
  // half of the eventual blend. The other half (trailing-7-day average of
  // this same raw score) is computed further down, once scoreHistory is
  // fetched. These raw values are what get persisted to life_score_logs —
  // never the blended figure, so the weekly average never recursively
  // smooths itself into unmovability (see README §1).

  // Health: reuses the Health module's own quality-aware calculateHealthScore
  // (nutrition×0.6 + activity×0.4, checked against real BMR/TDEE targets)
  // instead of a separate presence-only formula, so eating over/under a real
  // calorie target actually moves this score. Falls back to the old
  // presence-only calc only when no health_profile exists yet (targets
  // uncomputable) — same shape as before: workout-logged-today (60) +
  // metrics-logged-today (up to 40).
  const workoutScore = workoutsToday.length > 0 ? 60 : 0
  const metricsLogged = todayMetric ? Object.entries(todayMetric)
    .filter(([k]) => ['weight_kg','calories','protein_g','steps'].includes(k))
    .filter(([, v]) => v !== null).length : 0
  const healthPlan = computeHealthPlan(
    healthProfileRes.data ?? null,
    healthMetricsHistoryRes.data ?? [],
    workoutsToday.map(() => ({ date: today })) as unknown as Workout[],
    today
  )
  const healthScore = healthPlan
    ? healthPlan.healthScore.overall
    : Math.round(workoutScore + (metricsLogged / 4) * 40)

  // Finance: same band shape as before, smoothed within each band instead of
  // a hard cliff at 0.9→1.0 — a ₹1 overspend used to cost 25 points outright.
  let financeScore = 50
  if (monthBudget > 0) {
    const ratio = monthSpend / monthBudget
    financeScore = Math.round(
      ratio <= 0.70 ? 100
      : ratio <= 0.85 ? 90 - (ratio - 0.70) / 0.15 * 15
      : ratio <= 1.00 ? 75 - (ratio - 0.85) / 0.15 * 20
      : ratio <= 1.20 ? 55 - (ratio - 1.00) / 0.20 * 25
      : Math.max(10, 30 - (ratio - 1.20) * 40)
    )
  } else if (monthSpend === 0) {
    financeScore = 60
  }

  // Career: recurring signals replace static one-time fillers — a quiz taken
  // once used to permanently max that clause; now it's quiz attempts in the
  // last 30 days, plus a new job-alert-tracked signal.
  const profileFilled = !!(careerProfileRes.data?.current_role && careerProfileRes.data?.target_role)
  const skillCount = skillsRes.count ?? 0
  const quizAttempts30dCount = (quizAttemptsRes.data ?? []).filter(a => (a.created_at as string) >= istMidnightUtc(30)).length
  const allApplicationCompanies = new Set((allApplicationsRes.data ?? []).map(a => (a.company as string).toLowerCase()))
  const jobAlertTracked30d = ((jobAlerts30dRes.data ?? []) as { company: string }[])
    .some(j => allApplicationCompanies.has(j.company.toLowerCase()))
  const careerScore = Math.min(100,
    (profileFilled ? 15 : 0) +
    Math.min(20, skillCount * 2) +
    Math.min(25, activeApps * 8) +
    Math.min(20, quizAttempts30dCount * 4) +
    (jobAlertTracked30d ? 20 : 0)
  )

  // Learning: resources completed in the last 30 days (by completed_at,
  // added 2026-09-24) against a target — was completed/total, a backlog
  // ratio that moved when unread items were deleted rather than when
  // anything was actually read.
  const learningCompleted30d = resources.filter(r => r.status === 'completed' && r.completed_at && r.completed_at >= istMidnightUtc(30)).length
  const learningScore = Math.min(100, Math.round((learningCompleted30d / LIFE_SCORE_THRESHOLDS.learningCompletionsTarget) * 100))

  // Coding: weighted by category over the last 30 days instead of a flat
  // count — algorithm and system-design questions take meaningfully longer
  // than a quiz/JS-function/UI-coding pick, so they're worth more. Reuses
  // codingHistoryForWeakAreas (already fetched for Weak Areas) — no new query.
  // Both halves key on completed_at (when the work was done), not
  // assigned_date — a bulk catch-up of old picks used to count as recent.
  const codingSolved30d = codingSolved30dRes.count ?? 0
  const codingCompleted30d = codingHistoryForWeakAreas.filter(r => r.completed && r.completed_at && r.completed_at >= istMidnightUtc(30))
  const codingWeighted30d = codingCompleted30d
    .reduce((sum, r) => sum + (LIFE_SCORE_THRESHOLDS.codingCategoryWeight[r.question.category] ?? 1.0), 0)
  const codingPracticeDays30d = new Set(codingCompleted30d.map(r => toISTDateStr(r.completed_at!))).size
  const codingVolume = Math.min(100, Math.round(codingWeighted30d * LIFE_SCORE_THRESHOLDS.codingWeightedMultiplier))
  const codingConsistency = Math.min(100, Math.round((codingPracticeDays30d / LIFE_SCORE_THRESHOLDS.codingPracticeDaysTarget) * 100))
  const projectsScore = Math.round(codingVolume * 0.5 + codingConsistency * 0.5)

  // --- Score tips ---
  // Deterministic, no AI call — each tip names the single highest-point-value
  // gap for that module, picked the same way computeTopActions ranks by score.
  const healthDeficit = workoutScore === 0 ? 60 : 0
  const metricsDeficit = 40 - (metricsLogged / 4) * 40
  const healthTip = healthPlan
    ? (healthPlan.healthScore.nutrition.score <= healthPlan.healthScore.activity.score
        ? healthPlan.healthScore.nutrition.reason
        : healthPlan.healthScore.activity.reason)
    : healthDeficit > 0 && healthDeficit >= metricsDeficit
      ? 'No workout logged today — worth 60% of this score'
      : metricsDeficit > 0
        ? `Log ${4 - metricsLogged} more metric${4 - metricsLogged > 1 ? 's' : ''} today (weight, calories, protein, steps)`
        : 'Fully logged today — keep it up'

  const financeTip = monthBudget === 0
    ? 'Set a monthly budget for a real score instead of the neutral default'
    : monthSpend / monthBudget >= 1.00
      ? 'Over budget this month — pull back spending to recover'
      : monthSpend / monthBudget >= 0.85
        ? 'Close to your budget limit — slow down for the rest of the month'
        : 'Under budget — nothing to do here'

  const careerDeficits: [number, string][] = [
    [profileFilled ? 0 : 15, 'Fill in your career profile (current + target role) — worth 15 points'],
    [20 - Math.min(20, skillCount * 2), 'Add a few more skills to the tracker'],
    [25 - Math.min(25, activeApps * 8), 'No active applications — apply somewhere to earn up to 25 points'],
    [20 - Math.min(20, quizAttempts30dCount * 4), 'Take an interview prep quiz — worth up to 20 points, and recurring monthly (not a one-time fill)'],
    [jobAlertTracked30d ? 0 : 20, 'Track a Job Alert lead into an application — worth 20 points'],
  ]
  const topCareerDeficit = careerDeficits.reduce((a, b) => (b[0] > a[0] ? b : a))
  const careerTip = topCareerDeficit[0] > 0 ? topCareerDeficit[1] : 'Career basics maxed — check the AI Mentor for what\'s next'

  const learningTip = learningCompleted30d >= LIFE_SCORE_THRESHOLDS.learningCompletionsTarget
    ? 'Maxed out — steady reading habit'
    : `${learningCompleted30d} of ${LIFE_SCORE_THRESHOLDS.learningCompletionsTarget} completions in 30 days — finish today's read`

  const projectsTip = codingWeighted30d === 0
    ? 'No coding questions solved in the last 30 days — start today\'s question'
    : codingConsistency < codingVolume
      ? `${codingPracticeDays30d} practice days in 30 — a little most days beats batching`
      : projectsScore < 100
        ? 'Keep solving — algorithm and system-design questions count for more'
        : 'Maxed out — consistent practice'

  const scoreTips = { health: healthTip, finance: financeTip, career: careerTip, learning: learningTip, projects: projectsTip }

  // --- Life Score v2 blend: daily raw × 0.6 + trailing-7-day average × 0.4 ---
  // life_score_logs only ever stores each module's pure daily raw score
  // (unchanged from before) — never the blended figure. Storing the blend
  // would make tomorrow's weekly average partly an average of an average,
  // compounding every day into an un-moveable number. All blending happens
  // here, at read time, from that pure history.
  const priorHistory = (historyData ?? []).map(r => ({
    date: r.date as string, life: r.life_score as number,
    health: r.health_score as number, finance: r.finance_score as number,
    career: r.career_score as number, learning: r.learning_score as number,
    projects: r.projects_score as number,
  }))
  const priorHistoryByDate = new Map(priorHistory.map(r => [r.date, r]))

  const todayRaw: Record<ScoreModule, number> = {
    health: healthScore, finance: financeScore, career: careerScore,
    learning: learningScore, projects: projectsScore,
  }

  // Brand-new accounts shouldn't have their first week's weekly average
  // crushed toward 0 by pre-signup days that were never really "missed."
  const accountCreatedDate = user.created_at ? user.created_at.slice(0, 10) : null

  function subtractDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d - n)).toISOString().split('T')[0]
  }

  // A day in the trailing window with no life_score_logs row at all (app
  // wasn't opened, so nothing was ever computed/stored) counts as 0 raw
  // score for that day — not excluded from the average. Excluding it would
  // let a day with zero engagement be averaged out of existence.
  function rawOn(date: string, key: ScoreModule): number {
    if (date === today) return todayRaw[key]
    return priorHistoryByDate.get(date)?.[key] ?? 0
  }

  function weeklyAvgEnding(date: string, key: ScoreModule): number {
    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = subtractDays(date, i)
      if (accountCreatedDate && d < accountCreatedDate) continue
      days.push(d)
    }
    if (days.length === 0) return 0
    return days.reduce((s, d) => s + rawOn(d, key), 0) / days.length
  }

  function blendedOn(date: string, key: ScoreModule): number {
    return Math.round(
      rawOn(date, key) * LIFE_SCORE_THRESHOLDS.dailyWeight +
      weeklyAvgEnding(date, key) * LIFE_SCORE_THRESHOLDS.weeklyWeight
    )
  }

  const yesterday = subtractDays(today, 1)
  const isFirstDay = accountCreatedDate === today

  const moduleKeys: ScoreModule[] = ['health', 'finance', 'career', 'learning', 'projects']
  const scoreBreakdown = Object.fromEntries(moduleKeys.map(key => {
    const blendedToday = blendedOn(today, key)
    const blendedYesterday = isFirstDay ? null : blendedOn(yesterday, key)
    return [key, {
      today: todayRaw[key],
      weeklyAvg: Math.round(weeklyAvgEnding(today, key)),
      blended: blendedToday,
      delta: blendedYesterday === null ? null : blendedToday - blendedYesterday,
    }]
  })) as Record<ScoreModule, ModuleBreakdown>

  const lifeScore = Math.round(
    scoreBreakdown.health.blended    * 0.25 +
    scoreBreakdown.finance.blended   * 0.20 +
    scoreBreakdown.career.blended    * 0.20 +
    scoreBreakdown.learning.blended  * 0.20 +
    scoreBreakdown.projects.blended  * 0.15
  )
  const yesterdayLifeScore = isFirstDay ? null : (priorHistoryByDate.get(yesterday)?.life ?? null)
  const lifeDelta = yesterdayLifeScore === null ? null : lifeScore - yesterdayLifeScore

  // Upsert today's *raw* scores for history tracking, plus the blended
  // life_score (the one figure that's fine to store already-blended, since
  // nothing ever averages life_score itself back into a future computation —
  // only the per-module raw scores feed the weekly averages above).
  // Written after the response is sent (next/server's after()) — the page
  // never reads this write back, and awaiting it held up every Dashboard
  // render by ~500ms. Service client since the request's cookie scope is
  // gone by then; the row is still scoped explicitly to this user.
  const userId = user.id
  after(async () => {
    await createServiceClient().from('life_score_logs').upsert({
      user_id: userId, date: today,
      health_score: healthScore, finance_score: financeScore,
      career_score: careerScore, learning_score: learningScore,
      projects_score: projectsScore, life_score: lifeScore,
    }, { onConflict: 'user_id,date' })
  })

  const scoreHistory = [
    ...priorHistory.filter(r => r.date !== today),
    { date: today, life: lifeScore, health: healthScore, finance: financeScore, career: careerScore, learning: learningScore, projects: projectsScore },
  ].sort((a, b) => a.date.localeCompare(b.date))

  // --- AI spend (from ai_usage_logs, written by the AI Gateway) ---
  const aiUsageMonth = aiUsageMonthRes.data ?? []
  const aiUsageToday = aiUsageMonth.filter(r => (r.created_at as string) >= istMidnightUtc())
  const aiBudget = {
    callsToday: aiUsageToday.length,
    costTodayUsd: aiUsageToday.reduce((s, r) => s + Number(r.estimated_cost_usd), 0),
    callsMonth: aiUsageMonth.length,
    costMonthUsd: aiUsageMonth.reduce((s, r) => s + Number(r.estimated_cost_usd), 0),
    cacheHitRateMonth: aiUsageMonth.length ? Math.round((aiUsageMonth.filter(r => r.cache_hit).length / aiUsageMonth.length) * 100) : 0,
  }

  const codingQuestionPending = codingTodayRows.length > 0 && codingTodayRows.some(r => !r.completed)
  const codingStaleRevisionCount = getStaleRevisionCount(codingCompletionsRes.data ?? [])
  const daysSinceLastQuizAttempt = daysSinceLastQuiz(quizAttemptsRes.data ?? [])
  const workoutPending = !!activeWorkout

  const workoutStatus: 'completed' | 'pending' | 'none' =
    (workoutCompletedTodayRes.data?.length ?? 0) > 0 ? 'completed' : activeWorkout ? 'pending' : 'none'
  const metricsLoggedToday = !!todayMetric && ['weight_kg', 'calories', 'protein_g', 'steps'].some(f => (todayMetric as Record<string, unknown>)[f] !== null)
  const expenseLoggedToday = (expensesRes.data ?? []).some(e => (e as { date: string }).date === today)

  const todayProgress = computeTodayProgress({
    tasksDueToday: tasksDueTodayRes.data ?? [],
    metricsLoggedToday,
    workoutStatus,
    codingPicks: codingTodayRows.map(r => ({ completed: r.completed, completedToday: !!r.completed_at && toISTDateStr(r.completed_at) === today })),
    dailyRead: todayDailyReadStatus,
    expenseLoggedToday,
  })

  const codingWeakAreas = computeWeakAreas(codingHistoryForWeakAreas)
  const careerTopWeakSubtopic = topWeakSubtopic(quizAttemptsRes.data ?? [])

  // Claude Design source's Dashboard strip only shows dasha lord names +
  // today's tithi/nakshatra (no until-date, no Yogini) — kept minimal here
  // to match; the full detail (until-date, Yogini) lives on the Astrology
  // page itself.
  const natalChart = astrologyProfileRes.data?.natal_chart as NatalChart | undefined
  const currentDasha = natalChart ? getCurrentDasha(natalChart.vimshottariDasha, today) : null
  const astrology = currentDasha ? {
    dashaLord: currentDasha.mahadasha.lord,
    antardashaLord: currentDasha.antardasha.lord,
    tithi: panchangTodayRes.data?.tithi ?? null,
    nakshatra: panchangTodayRes.data?.nakshatra ?? null,
  } : null

  const appliedCompanies = new Set(applications.map(a => (a as { company: string }).company.toLowerCase()))
  const topJobAlert = ((topJobAlertsRes.data ?? []) as { company: string; title: string }[])
    .find(j => !appliedCompanies.has(j.company.toLowerCase())) ?? null

  const topActions = computeTopActions({
    today, pendingTasks, applications, monthSpend, monthBudget, todayMetric, workoutPending,
    codingQuestionPending, codingStaleRevisionCount, daysSinceLastQuiz: daysSinceLastQuizAttempt,
    codingWeakAreas, careerTopWeakSubtopic, topJobAlert,
  })

  return {
    pendingTasks,
    recentApplications: applications.slice(0, 3),
    botActivity: botLogsRes.data ?? [],
    todayHealth: todayMetric,
    scoreHistory,
    // The blended (daily×0.6 + weekly×0.4) figure per module — what the
    // Module Score rings display, consistent with lifeScore itself being a
    // blended aggregate. scoreBreakdown carries the raw/weekly/blended/delta
    // detail Explain My Score needs; scoreHistory stays pure-raw per module
    // (see the upsert comment above).
    scores: {
      health: scoreBreakdown.health.blended, finance: scoreBreakdown.finance.blended,
      career: scoreBreakdown.career.blended, learning: scoreBreakdown.learning.blended,
      projects: scoreBreakdown.projects.blended, life: lifeScore,
    },
    scoreBreakdown,
    lifeDelta,
    scoreTips,
    stats: {
      pendingTaskCount: pendingTasks.length,
      overdueCount: pendingTasks.filter(t => t.due_date && t.due_date < today).length,
      activeApplications: activeApps,
      workoutsToday: workoutsToday.length,
      monthSpend, monthBudget,
      learningInProgress,
      codingSolved30d,
      workoutStreak: workoutStats.currentStreakDays,
    },
    codingQuestionPending,
    workoutCategory: activeWorkout?.workout?.category ?? null,
    aiBudget,
    topActions,
    todayProgress,
    careerMemory: {
      currentRole: careerProfileRes.data?.current_role ?? null,
      currentCompany: careerProfileRes.data?.current_company ?? null,
      targetRole: careerProfileRes.data?.target_role ?? null,
      currentSalary: careerProfileRes.data?.current_salary ?? null,
      bio: careerProfileRes.data?.bio ?? null,
    },
    // Memory Evolution (Phase 3 PRD) — Goals, read straight through like
    // careerMemory above (Core Principle 1: the Brain never owns data).
    financialGoals: (financialGoalsRes.data ?? []).map(g => ({
      name: g.name as string,
      targetAmount: Number(g.target_amount),
      currentAmount: Number(g.current_amount),
      targetDate: g.target_date as string | null,
    })),
    recentPatterns,
    astrology,
  }
}
