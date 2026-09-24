import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST } from '@/lib/date'
import { PLANNER_THRESHOLDS } from '@/lib/thresholds'
import { getTodayAssignmentRows } from '@/features/coding/daily-core'
import { getActiveDailyRead, DAILY_READ_NOTE_PREFIX } from '@/features/learning/daily-read'

// Removes Planner tasks auto-created for daily coding picks and daily reads
// that have sat open past PLANNER_THRESHOLDS.staleAutoTaskDays. Only the
// Planner task goes — the coding question stays pending in Practice Log and
// the resource stays in Learning, just unlinked (task_id → null; every
// completion path already treats a null task_id as "nothing to sync").
// Deterministic, idempotent; run once a day by the daily-coding cron.
export async function expireStaleAutoTasks(supabase: SupabaseClient, userId: string): Promise<number> {
  const cutoff = daysAgoIST(PLANNER_THRESHOLDS.staleAutoTaskDays)
  const [{ data: questions }, { data: resources }, active, { data: latestRead }] = await Promise.all([
    supabase.from('coding_daily_questions').select('id, task_id')
      .eq('user_id', userId).eq('completed', false).lt('assigned_date', cutoff).not('task_id', 'is', null),
    supabase.from('resources').select('id, task_id')
      .eq('user_id', userId).neq('status', 'completed').lt('created_at', `${cutoff}T00:00:00+05:30`).not('task_id', 'is', null),
    getTodayAssignmentRows(supabase, userId),
    supabase.from('resources').select('id, notes, created_at, status')
      .eq('user_id', userId).ilike('notes', `${DAILY_READ_NOTE_PREFIX}%`).order('created_at', { ascending: false }).limit(1),
  ])
  // A carried-over pick that's still the active one for its type keeps its
  // Planner task, however old — only superseded/abandoned picks are expired.
  const activeIds = new Set(active.map(r => r.id))
  const qRows = ((questions ?? []) as { id: string; task_id: string }[]).filter(r => !activeIds.has(r.id))
  // Same for the carried-over daily read (judged against the newest daily
  // read overall, not just the old rows fetched above).
  const activeRead = getActiveDailyRead((latestRead ?? []) as { id: string; notes: string | null; created_at: string; status: 'not-started' | 'in-progress' | 'completed' }[])
  const rRows = ((resources ?? []) as { id: string; task_id: string }[]).filter(r => r.id !== activeRead?.id)
  const taskIds = [...qRows, ...rRows].map(r => r.task_id)
  if (taskIds.length === 0) return 0

  // Unlink first so the task delete can't trip a foreign key.
  if (qRows.length) await supabase.from('coding_daily_questions').update({ task_id: null }).in('id', qRows.map(r => r.id))
  if (rRows.length) await supabase.from('resources').update({ task_id: null }).in('id', rRows.map(r => r.id))
  // Only still-open tasks — never delete one the user already ticked off.
  const { data: deleted } = await supabase.from('tasks').delete().in('id', taskIds).eq('done', false).select('id')
  return deleted?.length ?? 0
}
