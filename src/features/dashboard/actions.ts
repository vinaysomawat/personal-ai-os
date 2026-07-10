'use server'

import { createClient } from '@/lib/supabase/server'

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
}

// Deterministic ranking — no AI call. Per Product Principles (CLAUDE.md):
// "reduce decisions, don't just surface data" — surface the 3 highest-impact
// actions instead of a wall of stat cards.
function computeTopActions(input: TopActionInput): TopAction[] {
  const { today, pendingTasks, applications, monthSpend, monthBudget, todayMetric } = input
  const candidates: (TopAction & { score: number })[] = []

  const overdue = pendingTasks.filter(t => t.due_date && t.due_date < today)
  if (overdue.length > 0) {
    candidates.push({
      score: 100, emoji: '🔴', href: '/planner',
      text: `${overdue.length} task${overdue.length > 1 ? 's' : ''} overdue — clear ${overdue.length > 1 ? 'these' : 'this'} first`,
    })
  }

  const interviewApps = applications.filter(a => a.status === 'interview')
  if (interviewApps.length > 0) {
    candidates.push({
      score: 90, emoji: '🎯', href: '/career',
      text: `${interviewApps.length} application${interviewApps.length > 1 ? 's' : ''} at interview stage — prep now`,
    })
  }

  if (monthBudget > 0) {
    const ratio = monthSpend / monthBudget
    if (ratio >= 1) {
      candidates.push({ score: 80, emoji: '💸', href: '/finance', text: `Over budget this month by ₹${Math.round(monthSpend - monthBudget).toLocaleString('en-IN')}` })
    } else if (ratio >= 0.9) {
      candidates.push({ score: 55, emoji: '💸', href: '/finance', text: `${Math.round(ratio * 100)}% of monthly budget used` })
    }
  }

  const highPriorityPending = pendingTasks.filter(t => t.priority === 'high' && !(t.due_date && t.due_date < today))
  if (highPriorityPending.length > 0) {
    candidates.push({
      score: 70, emoji: '⚡', href: '/planner',
      text: `${highPriorityPending.length} high-priority task${highPriorityPending.length > 1 ? 's' : ''} pending`,
    })
  }

  const metricsLoggedToday = !!todayMetric && ['weight_kg', 'calories', 'steps'].some(k => todayMetric[k] != null)
  if (!metricsLoggedToday) {
    candidates.push({ score: 50, emoji: '📊', href: '/health', text: 'No health metrics logged today' })
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3).map(c => ({ emoji: c.emoji, text: c.text, href: c.href }))
}

export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  if (!user) return {
    pendingTasks: [], recentApplications: [], botActivity: [],
    scores: { health: 0, finance: 50, career: 0, learning: 0, projects: 0, life: 0 },
    todayHealth: null,
    scoreHistory: [] as { date: string; life: number; health: number; finance: number; career: number; learning: number; projects: number }[],
    gamification: { xp: 0, level: 1, xpProgress: 0, streak: 0, badges: [] as string[] },
    stats: { pendingTaskCount: 0, activeApplications: 0, workoutsToday: 0, monthSpend: 0, monthBudget: 0, learningInProgress: 0, githubCommits: 0, documentCount: 0 },
    aiBudget: { callsToday: 0, costTodayUsd: 0, callsMonth: 0, costMonthUsd: 0, cacheHitRateMonth: 0 },
    topActions: [] as TopAction[],
  }

  const [
    tasksRes, appsRes, workoutsRes,
    expensesRes, budgetsRes, resourcesRes, docsRes,
    botLogsRes, healthMetricRes, careerProfileRes, skillsRes, qaRes,
    aiUsageMonthRes,
  ] = await Promise.all([
    supabase.from('tasks').select('id, text, done, priority, due_date').eq('user_id', user.id).eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('applications').select('id, company, role, status, applied_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('workouts').select('id').eq('user_id', user.id).eq('date', today),
    supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', monthStart),
    supabase.from('budgets').select('amount').eq('user_id', user.id).eq('month', today.slice(0, 7)),
    supabase.from('resources').select('status').eq('user_id', user.id),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('telegram_logs').select('module, message, response, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).eq('date', today).single(),
    supabase.from('career_profile').select('current_role, target_role').eq('user_id', user.id).single(),
    supabase.from('skills').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('interview_qa').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('ai_usage_logs').select('estimated_cost_usd, cache_hit, created_at').eq('user_id', user.id).gte('created_at', `${monthStart}T00:00:00.000Z`),
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

  // Career: profile filled + skills + active apps + QA bank
  const profileFilled = !!(careerProfileRes.data?.current_role && careerProfileRes.data?.target_role)
  const skillCount = skillsRes.count ?? 0
  const qaCount = qaRes.count ?? 0
  const careerScore = Math.min(100,
    (profileFilled ? 25 : 0) +
    Math.min(25, skillCount * 3) +
    Math.min(30, activeApps * 10) +
    (qaCount > 0 ? 20 : 0)
  )

  // Learning: completed / total (in-progress counts as half)
  const learningScore = resources.length > 0
    ? Math.min(100, Math.round(((learningCompleted + learningInProgress * 0.5) / resources.length) * 100))
    : 0

  // Projects: GitHub push activity over the last 30 days (no manual project tracking anymore)
  let githubCommits = 0
  const githubUsername = process.env.GITHUB_USERNAME
  if (githubUsername) {
    try {
      const ghRes = await fetch(
        `https://api.github.com/users/${githubUsername}/events?per_page=100`,
        { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ''}`, 'X-GitHub-Api-Version': '2022-11-28' }, next: { revalidate: 3600 } }
      )
      if (ghRes.ok) {
        const events = await ghRes.json() as { type: string; created_at: string }[]
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
        githubCommits = events.filter(e => e.type === 'PushEvent' && e.created_at > cutoff).length
      }
    } catch { /* GitHub unavailable — skip */ }
  }
  const projectsScore = Math.min(100, githubCommits * 5)

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
  const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const allTimeSince = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]

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
  const d = new Date(today)
  while (logDates.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate() - 1)
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
  const aiUsageToday = aiUsageMonth.filter(r => (r.created_at as string) >= `${today}T00:00:00.000Z`)
  const aiBudget = {
    callsToday: aiUsageToday.length,
    costTodayUsd: aiUsageToday.reduce((s, r) => s + Number(r.estimated_cost_usd), 0),
    callsMonth: aiUsageMonth.length,
    costMonthUsd: aiUsageMonth.reduce((s, r) => s + Number(r.estimated_cost_usd), 0),
    cacheHitRateMonth: aiUsageMonth.length ? Math.round((aiUsageMonth.filter(r => r.cache_hit).length / aiUsageMonth.length) * 100) : 0,
  }

  const topActions = computeTopActions({
    today, pendingTasks, applications, monthSpend, monthBudget, todayMetric,
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
    stats: {
      pendingTaskCount: pendingTasks.length,
      activeApplications: activeApps,
      workoutsToday: workoutsToday.length,
      monthSpend, monthBudget,
      learningInProgress,
      githubCommits,
      documentCount: docsRes.count ?? 0,
    },
    aiBudget,
    topActions,
  }
}
