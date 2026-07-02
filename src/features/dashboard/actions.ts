'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pendingTasks: [], recentApplications: [], stats: { pendingTaskCount: 0, activeApplications: 0, habitsDoneToday: 0, totalHabits: 0, monthSpend: 0, learningInProgress: 0, activeProjects: 0, documentCount: 0 } }

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [tasksRes, appsRes, habitsRes, logsRes, expensesRes, resourcesRes, projectsRes, docsRes, botLogsRes] = await Promise.all([
    supabase.from('tasks').select('id, text, done, priority').eq('user_id', user.id).eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('applications').select('id, company, role, status, applied_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('habits').select('id').eq('user_id', user.id),
    supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('logged_date', today),
    supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', monthStart),
    supabase.from('resources').select('status').eq('user_id', user.id),
    supabase.from('projects').select('status').eq('user_id', user.id),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('telegram_logs').select('module, message, response, created_at').order('created_at', { ascending: false }).limit(20),
  ])

  const pendingTasks = tasksRes.data ?? []
  const applications = appsRes.data ?? []
  const habits = habitsRes.data ?? []
  const todayLogs = logsRes.data ?? []
  const expenses = expensesRes.data ?? []
  const resources = resourcesRes.data ?? []
  const projects = projectsRes.data ?? []

  const activeApps = applications.filter(a => ['applied', 'screening', 'interview'].includes(a.status)).length
  const monthSpend = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const learningInProgress = resources.filter(r => r.status === 'in-progress').length
  const activeProjects = projects.filter(p => p.status === 'in-progress').length

  return {
    pendingTasks,
    recentApplications: applications.slice(0, 3),
    botActivity: botLogsRes.data ?? [],
    stats: {
      pendingTaskCount: pendingTasks.length,
      activeApplications: activeApps,
      habitsDoneToday: todayLogs.length,
      totalHabits: habits.length,
      monthSpend,
      learningInProgress,
      activeProjects,
      documentCount: docsRes.count ?? 0,
    },
  }
}
