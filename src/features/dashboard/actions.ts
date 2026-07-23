'use server'

import { createClient } from '@/lib/supabase/server'
import { todayIST, daysAgoIST, istMidnightUtc, istDateStrToUtcMidnight } from '@/lib/date'
import { getResourcesNeedingRevision } from '@/features/learning/calculations'
import { getTodayAssignmentRows, getStaleRevisionCount } from '@/features/coding/daily-core'
import { getActiveWorkout } from '@/features/health/workout-core'
import type { Resource, StudyLog } from '@/features/learning/types'
import { rankSignals, type Signal } from '@/lib/signals'
import { checkOverdueTasks, checkHighPriorityPending } from '@/features/planner/signals'
import { checkInterviewStage, checkQuizNeedsRevision, checkQuizWeakArea } from '@/features/career/signals'
import { daysSinceLastQuiz, topWeakSubtopic } from '@/features/career/quiz-calculations'
import { checkBudget } from '@/features/finance/signals'
import { checkQuestionPending, checkStaleRevision, checkCodingWeakArea } from '@/features/coding/signals'
import { computeWeakAreas, type WeakArea } from '@/features/coding/daily-core'
import { getInsightsHistory } from '@/features/coding/daily'
import { checkWorkoutPending, checkNoMetricsToday } from '@/features/health/signals'
import { checkRevisionNeeded } from '@/features/learning/signals'
import { checkGoalProgress } from '@/features/goals/signals'
import { getTodayTrendingReading } from '@/features/trending/core'
import { computeTodayProgress, getTodayRecommendations } from './daily-progress'
import { getRecentPatterns } from '@/features/brain/signals'
import { resolveAutoMetric } from '@/features/goals/actions'
import type { Goal, ResolvedGoal } from '@/features/goals/types'

export interface TopAction {
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
  resourcesNeedingRevision: number
  codingQuestionPending: boolean
  codingStaleRevisionCount: number
  daysSinceLastQuiz: number | null
  workoutPending: boolean
  goals: ResolvedGoal[]
  codingWeakAreas: WeakArea[]
  careerTopWeakSubtopic: { subtopic: string; count: number } | null
}

// Deterministic ranking — no AI call. Per Product Principles (CLAUDE.md):
// "reduce decisions, don't just surface data" — surface the 3 highest-impact
// actions instead of a wall of stat cards. Each candidate comes from its own
// module's signals.ts (see src/lib/signals.ts) rather than being hand-rolled
// here, so new modules can plug into Today's Focus without touching this file.
function computeTopActions(input: TopActionInput): TopAction[] {
  const { today, pendingTasks, applications, monthSpend, monthBudget, todayMetric, resourcesNeedingRevision, codingQuestionPending, codingStaleRevisionCount, daysSinceLastQuiz, workoutPending, goals, codingWeakAreas, careerTopWeakSubtopic } = input

  const signals = [
    checkOverdueTasks(pendingTasks, today),
    checkInterviewStage(applications),
    checkBudget(monthSpend, monthBudget),
    checkHighPriorityPending(pendingTasks, today),
    checkQuestionPending(codingQuestionPending),
    checkWorkoutPending(workoutPending),
    checkNoMetricsToday(todayMetric),
    checkRevisionNeeded(resourcesNeedingRevision),
    checkStaleRevision(codingStaleRevisionCount),
    checkQuizNeedsRevision(daysSinceLastQuiz),
    checkGoalProgress(goals),
    checkCodingWeakArea(codingWeakAreas),
    checkQuizWeakArea(careerTopWeakSubtopic),
  ].filter((s): s is Signal => s !== null)

  return rankSignals(signals, 5).map(s => ({ emoji: s.emoji, text: s.message, href: s.href }))
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
    todayHealth: null,
    scoreHistory: [] as { date: string; life: number; health: number; finance: number; career: number; learning: number; projects: number }[],
    gamification: { xp: 0, level: 1, xpProgress: 0, streak: 0, badges: [] as string[] },
    stats: { pendingTaskCount: 0, activeApplications: 0, workoutsToday: 0, monthSpend: 0, monthBudget: 0, learningInProgress: 0, codingSolved30d: 0, documentCount: 0 },
    aiBudget: { callsToday: 0, costTodayUsd: 0, callsMonth: 0, costMonthUsd: 0, cacheHitRateMonth: 0 },
    topActions: [] as TopAction[],
    todayProgress: { items: [], completed: 0, total: 0, score: 100 } as ReturnType<typeof computeTodayProgress>,
    todayRecommendations: [] as ReturnType<typeof getTodayRecommendations>,
    careerMemory: { currentRole: null, currentCompany: null, targetRole: null, currentSalary: null, bio: null } as { currentRole: string | null; currentCompany: string | null; targetRole: string | null; currentSalary: number | null; bio: string | null },
    financialGoals: [] as { name: string; targetAmount: number; currentAmount: number; targetDate: string | null }[],
    crossModuleGoals: [] as { module: string; name: string; progress: string }[],
    recentPatterns: [] as string[],
  }

  const studyLogsSince = daysAgoIST(14)

  const [
    tasksRes, appsRes, workoutsRes,
    expensesRes, budgetsRes, resourcesRes, docsRes,
    botLogsRes, healthMetricRes, careerProfileRes, skillsRes, quizCountRes,
    aiUsageMonthRes, studyLogsRes, codingTodayRows, activeWorkout, codingSolved30dRes,
    codingCompletionsRes, quizAttemptsRes, tasksDueTodayRes, todayTrendingReading, workoutCompletedTodayRes,
    recentPatterns, financialGoalsRes, crossModuleGoalsRes, codingHistoryForWeakAreas,
  ] = await Promise.all([
    supabase.from('tasks').select('id, text, done, priority, due_date').eq('user_id', user.id).eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('applications').select('id, company, role, status, applied_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('workouts').select('id').eq('user_id', user.id).eq('date', today),
    supabase.from('expenses').select('amount, date').eq('user_id', user.id).gte('date', monthStart),
    supabase.from('budgets').select('amount').eq('user_id', user.id).eq('month', today.slice(0, 7)),
    supabase.from('resources').select('id, status').eq('user_id', user.id),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('telegram_logs').select('module, message, response, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).eq('date', today).single(),
    supabase.from('career_profile').select('current_role, target_role, current_company, current_salary, bio').eq('user_id', user.id).single(),
    supabase.from('skills').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('ai_usage_logs').select('estimated_cost_usd, cache_hit, created_at').eq('user_id', user.id).gte('created_at', istDateStrToUtcMidnight(monthStart)),
    supabase.from('study_logs').select('id, date, resource_id').eq('user_id', user.id).gte('date', studyLogsSince),
    getTodayAssignmentRows(supabase, user.id),
    getActiveWorkout(supabase, user.id),
    supabase.from('coding_daily_questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true).gte('assigned_date', since30),
    supabase.from('coding_daily_questions').select('question_id, completed, completed_at').eq('user_id', user.id).eq('completed', true),
    supabase.from('quiz_attempts').select('created_at, weak_areas').eq('user_id', user.id),
    supabase.from('tasks').select('id, text, done').eq('user_id', user.id).eq('due_date', today),
    getTodayTrendingReading(supabase, user.id),
    supabase.from('daily_workouts').select('id').eq('user_id', user.id).eq('status', 'completed').gte('completed_at', istMidnightUtc()).limit(1),
    getRecentPatterns(supabase, user.id),
    supabase.from('financial_goals').select('name, target_amount, current_amount, target_date').eq('user_id', user.id).order('priority', { ascending: true }),
    supabase.from('goals').select('id, module, name, target_value, current_value, auto_metric, achieved_at').eq('user_id', user.id),
    getInsightsHistory(),
  ])

  const pendingTasks = tasksRes.data ?? []
  const applications = appsRes.data ?? []
  const workoutsToday = workoutsRes.data ?? []
  const expenses = expensesRes.data ?? []
  const budgets = budgetsRes.data ?? []
  const resources = resourcesRes.data ?? []
  const todayMetric = healthMetricRes.data ?? null

  const activeApps = applications.filter(a => ['applied', 'screening', 'interview'].includes(a.status)).length
  const monthSpend = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const monthBudget = budgets.reduce((s, b) => s + (b.amount ?? 0), 0)
  const learningInProgress = resources.filter(r => r.status === 'in-progress').length
  const learningCompleted = resources.filter(r => r.status === 'completed').length

  // --- Scores ---
  // Health: workout logged today + metrics logged today
  const workoutScore = workoutsToday.length > 0 ? 60 : 0
  const metricsLogged = todayMetric ? Object.entries(todayMetric)
    .filter(([k]) => ['weight_kg','calories','protein_g','sleep_hours','steps','water_ml'].includes(k))
    .filter(([, v]) => v !== null).length : 0
  const healthScore = Math.round(workoutScore + (metricsLogged / 6) * 40)

  // Finance: under/over budget; no budget = neutral 50
  let financeScore = 50
  if (monthBudget > 0) {
    const ratio = monthSpend / monthBudget
    financeScore = ratio <= 0.7 ? 100 : ratio <= 0.9 ? 85 : ratio <= 1.0 ? 70 : ratio <= 1.2 ? 45 : 20
  } else if (monthSpend === 0) {
    financeScore = 60
  }

  // Career: profile filled + skills + active apps + quiz practice
  const profileFilled = !!(careerProfileRes.data?.current_role && careerProfileRes.data?.target_role)
  const skillCount = skillsRes.count ?? 0
  const quizCount = quizCountRes.count ?? 0
  const careerScore = Math.min(100,
    (profileFilled ? 25 : 0) +
    Math.min(25, skillCount * 3) +
    Math.min(30, activeApps * 10) +
    (quizCount > 0 ? 20 : 0)
  )

  // Learning: completed / total (in-progress counts as half)
  const learningScore = resources.length > 0
    ? Math.min(100, Math.round(((learningCompleted + learningInProgress * 0.5) / resources.length) * 100))
    : 0

  // Coding: daily-question completions over the last 30 days (was GitHub push
  // activity — swapped to the app's own coding-module data so the score
  // doesn't depend on external credentials that were never configured, per
  // Product Principle 1: prefer what's already tracked in-app).
  const codingSolved30d = codingSolved30dRes.count ?? 0
  const projectsScore = Math.min(100, codingSolved30d * 4)

  // --- Score tips ---
  // Deterministic, no AI call — each tip names the single highest-point-value
  // gap for that module, picked the same way computeTopActions ranks by score.
  const healthDeficit = workoutScore === 0 ? 60 : 0
  const metricsDeficit = 40 - (metricsLogged / 6) * 40
  const healthTip = healthDeficit > 0 && healthDeficit >= metricsDeficit
    ? 'No workout logged today — worth 60% of this score'
    : metricsDeficit > 0
      ? `Log ${6 - metricsLogged} more metric${6 - metricsLogged > 1 ? 's' : ''} today (weight, calories, protein, sleep, steps, water)`
      : 'Fully logged today — keep it up'

  const financeTip = monthBudget === 0
    ? 'Set a monthly budget for a real score instead of the neutral default'
    : monthSpend / monthBudget >= 1
      ? 'Over budget this month — pull back spending to recover'
      : monthSpend / monthBudget >= 0.9
        ? 'Close to your budget limit — slow down for the rest of the month'
        : 'Under budget — nothing to do here'

  const careerDeficits: [number, string][] = [
    [profileFilled ? 0 : 25, 'Fill in your career profile (current + target role) — worth 25 points'],
    [25 - Math.min(25, skillCount * 3), 'Add a few more skills to the tracker'],
    [30 - Math.min(30, activeApps * 10), 'No active applications — apply somewhere to earn up to 30 points'],
    [quizCount > 0 ? 0 : 20, 'Take an interview prep quiz — worth 20 points'],
  ]
  const topCareerDeficit = careerDeficits.reduce((a, b) => (b[0] > a[0] ? b : a))
  const careerTip = topCareerDeficit[0] > 0 ? topCareerDeficit[1] : 'Career basics maxed — check the AI Mentor for what\'s next'

  const learningTip = resources.length === 0
    ? 'Add a learning resource to start tracking progress'
    : learningInProgress > 0
      ? 'Finish an in-progress resource for the biggest jump'
      : learningCompleted < resources.length
        ? 'Start one of your queued resources to begin earning credit'
        : 'All resources completed — add a new one to keep growing this score'

  const projectsTip = codingSolved30d === 0
    ? 'No coding questions solved in the last 30 days — start today\'s question'
    : codingSolved30d < 25
      ? `${25 - codingSolved30d} more solved questions this month would max this score`
      : 'Maxed out — consistent practice'

  const scoreTips = { health: healthTip, finance: financeTip, career: careerTip, learning: learningTip, projects: projectsTip }

  // Life Score: weighted aggregate
  const lifeScore = Math.round(
    healthScore   * 0.25 +
    financeScore  * 0.20 +
    careerScore   * 0.20 +
    learningScore * 0.20 +
    projectsScore * 0.15
  )

  // Upsert today's scores for history tracking
  await supabase.from('life_score_logs').upsert({
    user_id: user.id, date: today,
    health_score: healthScore, finance_score: financeScore,
    career_score: careerScore, learning_score: learningScore,
    projects_score: projectsScore, life_score: lifeScore,
  }, { onConflict: 'user_id,date' })

  // Fetch 30-day history + compute XP/gamification
  const since = daysAgoIST(30)
  const allTimeSince = daysAgoIST(365)

  const [historyRes, allTimeRes] = await Promise.all([
    supabase.from('life_score_logs')
      .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
      .eq('user_id', user.id).gte('date', since).order('date', { ascending: true }),
    supabase.from('life_score_logs')
      .select('date, life_score')
      .eq('user_id', user.id).gte('date', allTimeSince).order('date', { ascending: true }),
  ])

  const scoreHistory = (historyRes.data ?? []).map(r => ({
    date: r.date as string, life: r.life_score as number,
    health: r.health_score as number, finance: r.finance_score as number,
    career: r.career_score as number, learning: r.learning_score as number,
    projects: r.projects_score as number,
  }))

  // --- Gamification ---
  const allLogs = allTimeRes.data ?? []
  const totalXP = allLogs.reduce((s, r) => s + (r.life_score as number), 0)
  const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 2000, 3500, 5000, 7500, 10000]
  const level = LEVEL_THRESHOLDS.findIndex(t => totalXP < t) - 1
  const xpLevel = level < 0 ? LEVEL_THRESHOLDS.length - 1 : Math.max(1, level)
  const xpForNext = LEVEL_THRESHOLDS[xpLevel] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const xpForCurrent = LEVEL_THRESHOLDS[xpLevel - 1] ?? 0
  const xpProgress = xpForNext > xpForCurrent ? Math.round(((totalXP - xpForCurrent) / (xpForNext - xpForCurrent)) * 100) : 100

  // Streak: consecutive days from today backwards
  const logDates = new Set(allLogs.map(r => r.date as string))
  let streak = 0
  const d = new Date(`${today}T00:00:00Z`)
  while (logDates.has(d.toISOString().split('T')[0])) {
    streak++
    d.setUTCDate(d.getUTCDate() - 1)
  }

  const badges: string[] = []
  if (allLogs.length >= 1)  badges.push('🌱 First Step')
  if (allLogs.length >= 7)  badges.push('📅 Week Warrior')
  if (allLogs.length >= 30) badges.push('💪 Month Master')
  if (streak >= 7)          badges.push('🔥 7-Day Streak')
  if (streak >= 30)         badges.push('⚡ 30-Day Streak')
  if (lifeScore >= 50)      badges.push('⭐ Half Century')
  if (lifeScore >= 70)      badges.push('🏆 Century Club')
  if (lifeScore >= 90)      badges.push('💎 Elite')
  if (totalXP >= 1000)      badges.push('🎯 1K XP Club')

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

  const studyLogs = (studyLogsRes.data ?? []) as StudyLog[]
  const resourcesNeedingRevision = getResourcesNeedingRevision(resources as Resource[], studyLogs).length
  const codingQuestionPending = codingTodayRows.length > 0 && codingTodayRows.some(r => !r.completed)
  const codingStaleRevisionCount = getStaleRevisionCount(codingCompletionsRes.data ?? [])
  const daysSinceLastQuizAttempt = daysSinceLastQuiz(quizAttemptsRes.data ?? [])
  const workoutPending = !!activeWorkout

  const workoutStatus: 'completed' | 'pending' | 'none' =
    (workoutCompletedTodayRes.data?.length ?? 0) > 0 ? 'completed' : activeWorkout ? 'pending' : 'none'
  const metricsLoggedToday = !!todayMetric && ['weight_kg', 'calories', 'protein_g', 'steps'].some(f => (todayMetric as Record<string, unknown>)[f] !== null)
  const studiedToday = (studyLogsRes.data ?? []).some(l => l.date === today)
  const expenseLoggedToday = (expensesRes.data ?? []).some(e => (e as { date: string }).date === today)

  const todayProgress = computeTodayProgress({
    tasksDueToday: tasksDueTodayRes.data ?? [],
    metricsLoggedToday,
    workoutStatus,
    codingToday: codingTodayRows,
    trendingReading: todayTrendingReading,
    hasLearningResources: resources.length > 0,
    studiedToday,
    expenseLoggedToday,
  })
  const todayRecommendations = getTodayRecommendations(todayProgress)

  // Cross-Module Goal Engine (Phase 4 PRD) — Career/Learning/Coding goals,
  // read straight through and resolved live for auto-tracked ones (same
  // "Brain never owns data" pattern as careerMemory/financialGoals above).
  // Resolved once here so both Today's Focus (checkGoalProgress below) and
  // Ask Brain's context (crossModuleGoals) share the same live values.
  const crossModuleGoalsRaw = (crossModuleGoalsRes.data ?? []) as Goal[]
  const resolvedGoals: ResolvedGoal[] = await Promise.all(crossModuleGoalsRaw.map(async g => ({
    ...g,
    resolvedCurrentValue: g.auto_metric ? await resolveAutoMetric(supabase, user.id, g.auto_metric) : g.current_value,
  })))
  const crossModuleGoals = resolvedGoals.map(g => ({
    module: g.module,
    name: g.name,
    progress: g.achieved_at ? 'achieved' : g.target_value != null ? `${g.resolvedCurrentValue ?? 0} of ${g.target_value}` : 'in progress',
  }))

  const codingWeakAreas = computeWeakAreas(codingHistoryForWeakAreas)
  const careerTopWeakSubtopic = topWeakSubtopic(quizAttemptsRes.data ?? [])

  const topActions = computeTopActions({
    today, pendingTasks, applications, monthSpend, monthBudget, todayMetric, workoutPending,
    resourcesNeedingRevision, codingQuestionPending, codingStaleRevisionCount, daysSinceLastQuiz: daysSinceLastQuizAttempt,
    goals: resolvedGoals, codingWeakAreas, careerTopWeakSubtopic,
  })

  // Upsert XP record
  await supabase.from('user_xp').upsert(
    { user_id: user.id, xp: totalXP, level: xpLevel, badges, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  return {
    pendingTasks,
    recentApplications: applications.slice(0, 3),
    botActivity: botLogsRes.data ?? [],
    todayHealth: todayMetric,
    scoreHistory,
    gamification: { xp: totalXP, level: xpLevel, xpProgress, streak, badges },
    scores: { health: healthScore, finance: financeScore, career: careerScore, learning: learningScore, projects: projectsScore, life: lifeScore },
    scoreTips,
    stats: {
      pendingTaskCount: pendingTasks.length,
      activeApplications: activeApps,
      workoutsToday: workoutsToday.length,
      monthSpend, monthBudget,
      learningInProgress,
      codingSolved30d,
      documentCount: docsRes.count ?? 0,
    },
    aiBudget,
    topActions,
    todayProgress,
    todayRecommendations,
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
    crossModuleGoals,
    recentPatterns,
  }
}
