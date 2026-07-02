'use server'

import { createClient } from '@/lib/supabase/server'

export async function getDashboardData() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [tasksRes, appsRes, habitsRes, logsRes] = await Promise.all([
    supabase.from('tasks').select('id, text, done, priority').eq('done', false).order('created_at', { ascending: false }).limit(5),
    supabase.from('applications').select('id, company, role, status, applied_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('habits').select('id, name, icon'),
    supabase.from('habit_logs').select('habit_id, date').eq('date', today),
  ])

  const pendingTasks = tasksRes.data ?? []
  const applications = appsRes.data ?? []
  const habits = habitsRes.data ?? []
  const todayLogs = logsRes.data ?? []

  const activeApps = applications.filter(a => ['applied', 'screening', 'interview'].includes(a.status)).length
  const habitsDoneToday = todayLogs.length
  const totalHabits = habits.length

  return {
    pendingTasks,
    recentApplications: applications.slice(0, 3),
    stats: {
      pendingTaskCount: pendingTasks.length,
      activeApplications: activeApps,
      habitsDoneToday,
      totalHabits,
    },
  }
}
