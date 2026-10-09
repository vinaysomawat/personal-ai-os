'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { todayIST, daysAgoIST, istMidnightUtc, istDateStrToUtcMidnight, toISTDateStr } from '@/lib/date'
import { getActiveWorkout, computeWorkoutStats } from '@/features/health/workout-core'
import { computeHealthPlan } from '@/features/health/calculations'
import type { Workout } from '@/features/health/types'
import { rankSignals, type Signal } from '@/lib/signals'
import { checkUnscheduledProcess, checkUpcomingInterview } from '@/features/career/signals'
import { checkBudget } from '@/features/finance/signals'
import { checkRevisionDue } from '@/features/prep/signals'
import { revisionQueue, type RevisionItem } from '@/features/prep/war'
import { prepStreak } from '@/features/prep/core'
import type { BankQuestion } from '@/features/prep/types'
import { checkWorkoutPending, checkNoMetricsToday } from '@/features/health/signals'
import { computeTodayProgress } from './daily-progress'
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
  applications: { status: string }[]
  monthSpend: number
  monthBudget: number
  todayMetric: Record<string, unknown> | null
  workoutPending: boolean
  revision: RevisionItem[]
  nextRound: { company: string; kind: string; scheduled_at: string } | null
  scheduledCompanies: Set<string>
}

// Deterministic ranking — no AI call. Per Product Principles (CLAUDE.md):
// "reduce decisions, don't just surface data" — surface the 3 highest-impact
// actions instead of a wall of stat cards. Each candidate comes from its own
// module's signals.ts (see src/lib/signals.ts) rather than being hand-rolled
// here, so new modules can plug into Today's Focus without touching this file.
function computeTopActions(input: TopActionInput): TopAction[] {
  const { applications, monthSpend, monthBudget, todayMetric, workoutPending, revision, nextRound, scheduledCompanies } = input

  const signals = [
    checkUpcomingInterview(nextRound),
    checkUnscheduledProcess((applications as { company: string; status: string }[]).filter(a => a.status === 'screening' || a.status === 'interview'), scheduledCompanies),
    checkBudget(monthSpend, monthBudget),
    checkRevisionDue(revision),
    checkWorkoutPending(workoutPending),
    checkNoMetricsToday(todayMetric),
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
    recentApplications: [],
    scores: { health: 0, finance: 50, career: 0, projects: 0, life: 0 },
    scoreTips: { health: '', finance: '', career: '', projects: '' },
    scoreBreakdown: {
      health: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      finance: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      career: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
      projects: { today: 0, weeklyAvg: 0, blended: 0, delta: null },
    } as Record<ScoreModule, ModuleBreakdown>,
    lifeDelta: null as number | null,
    todayHealth: null,
    scoreHistory: [] as { date: string; life: number; health: number; finance: number; career: number; projects: number }[],
    stats: { activeApplications: 0, workoutsToday: 0, monthSpend: 0, monthBudget: 0, practiced30d: 0, workoutStreak: 0, prepStreak: 0 },
    prepToday: null as { done: number; total: number } | null,
    workoutCategory: null as string | null,
    aiBudget: { callsToday: 0, costTodayUsd: 0, callsMonth: 0, costMonthUsd: 0, cacheHitRateMonth: 0 },
    topActions: [] as TopAction[],
    todayProgress: { items: [], completed: 0, total: 0, score: 100 } as ReturnType<typeof computeTodayProgress>,
    careerMemory: { currentRole: null, currentCompany: null, targetRole: null, currentSalary: null, bio: null } as { currentRole: string | null; currentCompany: string | null; targetRole: string | null; currentSalary: number | null; bio: string | null },
    financialGoals: [] as { name: string; targetAmount: number; currentAmount: number; targetDate: string | null }[],
    astrology: null as { dashaLord: string; antardashaLord: string; tithi: string | null; nakshatra: string | null } | null,
    huntMode: false,
  }

  const [
    appsRes, workoutsRes,
    expensesRes, budgetsRes,
    healthMetricRes, careerProfileRes, mockRounds30dRes,
    aiUsageMonthRes, prepSessionsRes, activeWorkout,
    questions30dRes, workoutCompletedTodayRes,
    financialGoalsRes, progressRes,
    workoutStats, astrologyProfileRes, panchangTodayRes, roundsRes, prepSettingsRes,
    healthProfileRes, healthMetricsHistoryRes,
    { data: historyData },
  ] = await Promise.all([
    supabase.from('applications').select('id, company, role, status, applied_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('workouts').select('id').eq('user_id', user.id).eq('date', today),
    supabase.from('expenses').select('amount, date').eq('user_id', user.id).gte('date', monthStart),
    supabase.from('budgets').select('amount').eq('user_id', user.id).eq('month', today.slice(0, 7)),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).eq('date', today).single(),
    supabase.from('career_profile').select('current_role, target_role, current_company, current_salary, bio').eq('user_id', user.id).single(),
    supabase.from('mock_rounds').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', istMidnightUtc(30)),
    supabase.from('ai_usage_logs').select('estimated_cost_usd, cache_hit, created_at').eq('user_id', user.id).gte('created_at', istDateStrToUtcMidnight(monthStart)),
    // Prep sessions (today's plan for Daily Mission + the prep streak).
    supabase.from('prep_sessions').select('date, blocks, completed_at').eq('user_id', user.id).gte('date', daysAgoIST(60)).order('date', { ascending: false }),
    getActiveWorkout(supabase, user.id),
    supabase.from('interview_questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', istMidnightUtc(30)),
    supabase.from('daily_workouts').select('id').eq('user_id', user.id).eq('status', 'completed').gte('completed_at', istMidnightUtc()).limit(1),
    supabase.from('financial_goals').select('name, target_amount, current_amount, target_date').eq('user_id', user.id).order('priority', { ascending: true }),
    // Question Bank activity — the Practice sub-score and the revision queue.
    supabase.from('question_progress').select('last_seen_at, last_rating, last_rated_at, question:coding_questions(category, topics)').eq('user_id', user.id).gte('last_seen_at', istMidnightUtc(60)),
    computeWorkoutStats(supabase, user.id),
    // Astrology strip (3.4): reuses the already-computed natal_chart jsonb
    // (dasha math is pure/deterministic, no ephemeris recompute) and today's
    // already-cached panchang_daily row — no new AI/ephemeris cost added.
    supabase.from('astrology_profile').select('natal_chart').eq('user_id', user.id).maybeSingle(),
    supabase.from('panchang_daily').select('tithi, nakshatra').eq('date', today).maybeSingle(),
    // Scheduled interview rounds from now on — the upcoming-interview signal.
    supabase.from('interview_rounds').select('kind, scheduled_at, application:applications(company)').eq('user_id', user.id).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }),
    // Job Hunt Mode (target date set) — changes what the Dashboard shows.
    supabase.from('prep_settings').select('target_date').eq('user_id', user.id).maybeSingle(),
    // Life Score v2's Health sub-score reuses the Health module's own
    // nutrition/activity calc instead of a separate presence-only formula —
    // needs the profile (for targets) and enough metric history for the
    // same-day-or-most-recent weight lookback computeHealthPlan does.
    supabase.from('health_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).gte('date', since30).order('date', { ascending: false }),
    // Life-score history for the v2 blend below — independent of every
    // other query, so it runs in this same batch (was a separate sequential
    // round-trip after it, ~600ms).
    supabase.from('life_score_logs')
      .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
      .eq('user_id', user.id).gte('date', daysAgoIST(30)).order('date', { ascending: true }),
  ])

  const applications = appsRes.data ?? []
  const workoutsToday = workoutsRes.data ?? []
  const expenses = expensesRes.data ?? []
  const budgets = budgetsRes.data ?? []
  const todayMetric = healthMetricRes.data ?? null

  const activeApps = applications.filter(a => ['screening', 'interview'].includes(a.status)).length
  const monthSpend = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const monthBudget = budgets.reduce((s, b) => s + (b.amount ?? 0), 0)

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

  // Career (Interviews, 2026-10-08): profile + live interview processes +
  // practice that prepares for them — mock rounds and logged interview
  // questions in the last 30 days. (Was quizzes + job-alert tracking.)
  const profileFilled = !!(careerProfileRes.data?.current_role && careerProfileRes.data?.target_role)
  const mockRounds30d = mockRounds30dRes.count ?? 0
  const questions30d = questions30dRes.count ?? 0
  const careerScore = Math.min(100,
    (profileFilled ? 15 : 0) +
    Math.min(30, activeApps * 10) +
    Math.min(30, mockRounds30d * 6) +
    Math.min(25, questions30d * 5)
  )

  // Practice (the projects_score column; was Coding until Coding was folded
  // into Prep, 2026-10-10): Question Bank / Mock answers in the last 30 days
  // by question_progress.last_seen_at — category-weighted volume × 0.5 +
  // consistency (distinct practice days ÷ target) × 0.5, same formula as the
  // old Coding sub-score.
  type ProgressRow = { last_seen_at: string; last_rating: number | null; last_rated_at: string | null; question: { category: string; topics: string[] | null } | null }
  const progress = (progressRes.data ?? []) as unknown as ProgressRow[]
  const practiced30 = progress.filter(r => r.last_seen_at >= istMidnightUtc(30))
  const practiced30d = practiced30.length
  const practiceWeighted30d = practiced30.reduce((sum, r) => sum + ((LIFE_SCORE_THRESHOLDS.codingCategoryWeight as Record<string, number>)[r.question?.category ?? ''] ?? 1.0), 0)
  const practiceDays30d = new Set(practiced30.map(r => toISTDateStr(r.last_seen_at))).size
  const practiceVolume = Math.min(100, Math.round(practiceWeighted30d * LIFE_SCORE_THRESHOLDS.codingWeightedMultiplier))
  const practiceConsistency = Math.min(100, Math.round((practiceDays30d / LIFE_SCORE_THRESHOLDS.codingPracticeDaysTarget) * 100))
  const projectsScore = Math.round(practiceVolume * 0.5 + practiceConsistency * 0.5)
  const revision = revisionQueue(progress.filter(r => r.question).map(r => ({ category: r.question!.category, topics: r.question!.topics ?? [], last_rating: r.last_rating, last_rated_at: r.last_rated_at } as unknown as BankQuestion)), today)

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
    [30 - Math.min(30, activeApps * 10), 'No live interview process — add a company once a phone screen is booked'],
    [30 - Math.min(30, mockRounds30d * 6), 'Run a Mock Round in Prep — up to 30 points'],
    [25 - Math.min(25, questions30d * 5), 'Log the questions interviewers asked you — up to 25 points'],
  ]
  const topCareerDeficit = careerDeficits.reduce((a, b) => (b[0] > a[0] ? b : a))
  const careerTip = topCareerDeficit[0] > 0 ? topCareerDeficit[1] : 'Career basics maxed — keep the interview pipeline moving'

  const projectsTip = practiceWeighted30d === 0
    ? 'No questions practiced in the last 30 days — start today\'s Prep plan'
    : practiceConsistency < practiceVolume
      ? `${practiceDays30d} practice days in 30 — a little most days beats batching`
      : projectsScore < 100
        ? 'Keep practicing — system-design and coding questions count for more'
        : 'Maxed out — consistent practice'

  const scoreTips = { health: healthTip, finance: financeTip, career: careerTip, projects: projectsTip }

  // --- Life Score v2 blend: daily raw × 0.6 + trailing-7-day average × 0.4 ---
  // life_score_logs only ever stores each module's pure daily raw score
  // (unchanged from before) — never the blended figure. Storing the blend
  // would make tomorrow's weekly average partly an average of an average,
  // compounding every day into an un-moveable number. All blending happens
  // here, at read time, from that pure history.
  const priorHistory = (historyData ?? []).map(r => ({
    date: r.date as string, life: r.life_score as number,
    health: r.health_score as number, finance: r.finance_score as number,
    career: r.career_score as number,
    projects: r.projects_score as number,
  }))
  const priorHistoryByDate = new Map(priorHistory.map(r => [r.date, r]))

  const todayRaw: Record<ScoreModule, number> = {
    health: healthScore, finance: financeScore, career: careerScore,
    projects: projectsScore,
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

  const moduleKeys: ScoreModule[] = ['health', 'finance', 'career', 'projects']
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

  // Reweighted 2026-10-08 when Learning was removed (was 25/20/20/20/15
  // with Learning 20%); life_score_logs.learning_score now defaults to 0.
  const lifeScore = Math.round(
    scoreBreakdown.health.blended    * 0.30 +
    scoreBreakdown.finance.blended   * 0.25 +
    scoreBreakdown.career.blended    * 0.25 +
    scoreBreakdown.projects.blended  * 0.20
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
      career_score: careerScore,
      projects_score: projectsScore, life_score: lifeScore,
    }, { onConflict: 'user_id,date' })
  })

  const scoreHistory = [
    ...priorHistory.filter(r => r.date !== today),
    { date: today, life: lifeScore, health: healthScore, finance: financeScore, career: careerScore, projects: projectsScore },
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

  const workoutPending = !!activeWorkout

  const workoutStatus: 'completed' | 'pending' | 'none' =
    (workoutCompletedTodayRes.data?.length ?? 0) > 0 ? 'completed' : activeWorkout ? 'pending' : 'none'
  const metricsLoggedToday = !!todayMetric && ['weight_kg', 'calories', 'protein_g', 'steps'].some(f => (todayMetric as Record<string, unknown>)[f] !== null)
  const expenseLoggedToday = (expensesRes.data ?? []).some(e => (e as { date: string }).date === today)

  const prepSessions = (prepSessionsRes.data ?? []) as { date: string; blocks: { done: boolean }[]; completed_at: string | null }[]
  const todaySession = prepSessions.find(p => p.date === today) ?? null
  const todayProgress = computeTodayProgress({
    metricsLoggedToday,
    workoutStatus,
    prepBlocks: todaySession ? { done: todaySession.blocks.filter(b => b.done).length, total: todaySession.blocks.length } : null,
    expenseLoggedToday,
  })


  // Claude Design source's Dashboard strip only shows dasha lord names +
  // today's tithi/nakshatra (no until-date, no Yogini) — kept minimal here
  // to match; the full detail (until-date, Yogini) lives on the Astrology
  // page itself.
  const natalChart = astrologyProfileRes.data?.natal_chart as NatalChart | undefined
  const currentDasha = natalChart ? getCurrentDasha(natalChart.vimshottariDasha, today) : null
  const huntMode = !!prepSettingsRes.data?.target_date
  // The dasha segment is paused during Job Hunt Mode (plain greeting instead).
  const astrology = currentDasha && !huntMode ? {
    dashaLord: currentDasha.mahadasha.lord,
    antardashaLord: currentDasha.antardasha.lord,
    tithi: panchangTodayRes.data?.tithi ?? null,
    nakshatra: panchangTodayRes.data?.nakshatra ?? null,
  } : null

  const upcomingRounds = ((roundsRes.data ?? []) as unknown as { kind: string; scheduled_at: string; application: { company: string } | null }[])
  const nextRound = upcomingRounds[0] ? { company: upcomingRounds[0].application?.company ?? 'Interview', kind: upcomingRounds[0].kind, scheduled_at: upcomingRounds[0].scheduled_at } : null
  const scheduledCompanies = new Set(upcomingRounds.map(r => r.application?.company ?? ''))

  const topActions = computeTopActions({
    applications, monthSpend, monthBudget, todayMetric, workoutPending,
    revision, nextRound, scheduledCompanies,
  })

  return {
    recentApplications: applications.slice(0, 3),
    todayHealth: todayMetric,
    scoreHistory,
    // The blended (daily×0.6 + weekly×0.4) figure per module — what the
    // Module Score rings display, consistent with lifeScore itself being a
    // blended aggregate. scoreBreakdown carries the raw/weekly/blended/delta
    // detail Explain My Score needs; scoreHistory stays pure-raw per module
    // (see the upsert comment above).
    scores: {
      health: scoreBreakdown.health.blended, finance: scoreBreakdown.finance.blended,
      career: scoreBreakdown.career.blended,
      projects: scoreBreakdown.projects.blended, life: lifeScore,
    },
    scoreBreakdown,
    lifeDelta,
    scoreTips,
    stats: {
      activeApplications: activeApps,
      workoutsToday: workoutsToday.length,
      monthSpend, monthBudget,
      practiced30d,
      workoutStreak: workoutStats.currentStreakDays,
      prepStreak: prepStreak(prepSessions, today),
    },
    prepToday: todaySession ? { done: todaySession.blocks.filter(b => b.done).length, total: todaySession.blocks.length } : null,
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
    astrology,
    huntMode,
  }
}
