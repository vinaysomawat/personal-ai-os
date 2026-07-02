'use server'

import { createClient } from '@/lib/supabase/server'
import { aiText } from '@/lib/anthropic'
import { format } from 'date-fns'

export async function getDailyBriefing(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: tasks }, { data: apps }, { data: habits }, { data: logs }, { data: expenses }] = await Promise.all([
    supabase.from('tasks').select('text, done, priority, due_date').eq('user_id', user.id).eq('done', false).order('created_at'),
    supabase.from('applications').select('company, role, status').eq('user_id', user.id).neq('status', 'rejected').order('created_at'),
    supabase.from('habits').select('id, name, emoji').eq('user_id', user.id),
    supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('logged_date', today),
    supabase.from('expenses').select('amount, category').eq('user_id', user.id).gte('date', today.slice(0, 7) + '-01'),
  ])

  const pendingTasks = tasks ?? []
  const loggedIds = new Set((logs ?? []).map((l: { habit_id: string }) => l.habit_id))
  const habitsDue = (habits ?? []).filter((h: { id: string }) => !loggedIds.has(h.id))
  const totalSpent = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)

  const prompt = `Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')}.

PENDING TASKS (${pendingTasks.length}):
${pendingTasks.map((t: { priority: string; text: string; due_date: string | null }) => `- [${t.priority}] ${t.text}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n') || 'none'}

ACTIVE JOB APPLICATIONS (${apps?.length ?? 0}):
${(apps ?? []).map((a: { company: string; role: string; status: string }) => `- ${a.company} / ${a.role} — ${a.status}`).join('\n') || 'none'}

HABITS NOT YET DONE TODAY (${habitsDue.length}):
${habitsDue.map((h: { emoji: string; name: string }) => `${h.emoji} ${h.name}`).join(', ') || 'all done!'}

THIS MONTH'S SPENDING: ₹${totalSpent.toLocaleString('en-IN')}

Generate a morning briefing with:
1. A one-sentence focus for today
2. 3-5 bullets covering what needs attention (priority tasks, interviews to prep, habits)
3. One encouraging observation

Keep it under 150 words. Be direct and personal.`

  return aiText(prompt, 'You are Vinay\'s personal AI chief of staff. Write morning briefings that are sharp, motivating, and actionable. Use plain text, no markdown headers.')
}
