'use server'

import { createClient } from '@/lib/supabase/server'

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
    stats: { pendingTaskCount: 0, activeApplications: 0, habitsDoneToday: 0, totalHabits: 0, monthSpend: 0, monthBudget: 0, learningInProgress: 0, activeProjects: 0, completedProjects: 0, githubCommits: 0, documentCount: 0 },
  }

  const [
    tasksRes, appsRes, habitsRes, logsRes,
    expensesRes, budgetsRes, resourcesRes, projectsRes, docsRes,
    botLogsRes, healthMetricRes, careerProfileRes, skillsRes, qaRes,
  ] = await Promise.all([
    supabase.from('tasks').select('id, text, done, priority').eq('user_id', user.id).eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('applications').select('id, company, role, status, applied_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('habits').select('id').eq('user_id', user.id),
    supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('date', today), // fixed: was logged_date
    supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', monthStart),
    supabase.from('budgets').select('amount').eq('user_id', user.id).eq('month', today.slice(0, 7)),
    supabase.from('resources').select('status').eq('user_id', user.id),
    supabase.from('projects').select('status').eq('user_id', user.id),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('telegram_logs').select('module, message, response, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('health_metrics').select('*').eq('user_id', user.id).eq('date', today).single(),
    supabase.from('career_profile').select('current_role, target_role').eq('user_id', user.id).single(),
    supabase.from('skills').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('interview_qa').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const pendingTasks = tasksRes.data ?? []
  const applications = appsRes.data ?? []
  const habits = habitsRes.data ?? []
  const todayLogs = logsRes.data ?? []
  const expenses = expensesRes.data ?? []
  const budgets = budgetsRes.data ?? []
  const resources = resourcesRes.data ?? []
  const projects = projectsRes.data ?? []
  const todayMetric = healthMetricRes.data ?? null

  const activeApps = applications.filter(a => ['applied', 'screening', 'interview'].includes(a.status)).length
  const monthSpend = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const monthBudget = budgets.reduce((s, b) => s + (b.amount ?? 0), 0)
  const learningInProgress = resources.filter(r => r.status === 'in-progress').length
  const learningCompleted = resources.filter(r => r.status === 'completed').length
  const activeProjects = projects.filter(p => p.status === 'in-progress').length
  const completedProjects = projects.filter(p => p.status === 'completed').length

  // --- Scores ---
  // Health: habits done today + metrics logged today
  const habitScore = habits.length > 0 ? (todayLogs.length / habits.length) * 60 : 0
  const metricsLogged = todayMetric ? Object.entries(todayMetric)
    .filter(([k]) => ['weight_kg','calories','protein_g','sleep_hours','steps','water_ml'].includes(k))
    .filter(([, v]) => v !== null).length : 0
  const healthScore = Math.round(habitScore + (metricsLogged / 6) * 40)

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

  // Projects: reward active + completed work + GitHub activity
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
  const githubBoost = Math.min(25, githubCommits * 2)
  const projectsScore = projects.length === 0 && githubCommits === 0 ? 0
    : Math.min(100, activeProjects * 20 + completedProjects * 15 + githubBoost)

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
      habitsDoneToday: todayLogs.length,
      totalHabits: habits.length,
      monthSpend, monthBudget,
      learningInProgress, activeProjects, completedProjects,
      githubCommits,
      documentCount: docsRes.count ?? 0,
    },
  }
}
