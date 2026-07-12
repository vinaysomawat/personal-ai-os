import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Planner bot for Vinay AI OS. Parse the user message and return ONLY a JSON action, nothing else.

Actions:
{"action":"add_task","text":"task text","priority":"high"|"medium"|"low","area":"General","due_date":"YYYY-MM-DD or null"}
{"action":"list_tasks","filter":"pending"|"done"|"all"}
{"action":"complete_task","search":"partial task text"}
{"action":"delete_task","search":"partial task text"}
{"action":"undo_last"}
{"action":"briefing"}
{"action":"digest"}
{"action":"monthly_digest"}
{"action":"set_reminder","label":"what to be reminded about","slot":"morning"|"evening"}
{"action":"list_reminders"}
{"action":"delete_reminder","search":"partial reminder text"}
{"action":"help"}

Rules:
- Default priority: "medium", default area: "General", default due_date: null
- If user says "today" for due_date, use today's date
- For "how am I doing", "give me my briefing", "today's briefing" → briefing
- For "how was my week", "weekly digest", "weekly review" → digest
- For "how was my month", "monthly digest", "monthly review" → monthly_digest
- For "remind me to X every morning/day" → set_reminder with slot "morning"
- For "remind me to X every evening/night" → set_reminder with slot "evening"
- Reminders only fire at the two existing daily windows (~8:30am and ~8pm IST) — not arbitrary times
- For "undo that", "delete the last one", "oops ignore that task" → undo_last
- If message is unclear, return {"action":"help"}`

const P = { high: '🔴', medium: '🟡', low: '⚪' } as Record<string, string>

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'add_task': {
      const { data, error } = await db.from('tasks').insert({ user_id: userId, text: action.text, priority: action.priority ?? 'medium', area: action.area ?? 'General', due_date: action.due_date ?? null, done: false }).select('id').single()
      if (error) return `❌ ${error.message}`
      return {
        text: `✅ Added *${action.priority ?? 'medium'}* task:\n"${action.text}"${action.due_date ? `\n📅 ${action.due_date}` : ''}`,
        buttons: [[{ text: '✅ Mark Done', callback_data: `task_done:${data.id}` }]],
      }
    }
    case 'list_tasks': {
      const filter = (action.filter as string) ?? 'pending'
      let q = db.from('tasks').select('text, priority, done, due_date, area').eq('user_id', userId)
      if (filter === 'pending') q = q.eq('done', false)
      if (filter === 'done') q = q.eq('done', true)
      const { data } = await q.order('created_at', { ascending: false }).limit(10)
      if (!data?.length) return `No ${filter} tasks.`
      return `📋 *${filter.charAt(0).toUpperCase() + filter.slice(1)} tasks:*\n` +
        data.map(t => `${t.done ? '✅' : (P[t.priority] ?? '⚪')} ${t.text}${t.due_date ? ` _(${t.due_date})_` : ''}`).join('\n')
    }
    case 'complete_task': {
      const { data } = await db.from('tasks').select('id, text').eq('user_id', userId).eq('done', false).ilike('text', `%${action.search}%`).limit(1)
      const task = data?.[0]
      if (!task) return `❌ No pending task matching "${action.search}"`
      await db.from('tasks').update({ done: true }).eq('id', task.id)
      return `✅ Completed: "${task.text}"`
    }
    case 'delete_task': {
      const { data } = await db.from('tasks').select('id, text').eq('user_id', userId).ilike('text', `%${action.search}%`).limit(1)
      const task = data?.[0]
      if (!task) return `❌ No task matching "${action.search}"`
      await db.from('tasks').delete().eq('id', task.id)
      return `🗑️ Deleted: "${task.text}"`
    }
    case 'undo_last': {
      const { data } = await db.from('tasks').select('id, text').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const task = data?.[0]
      if (!task) return `❌ No recent task to undo.`
      await db.from('tasks').delete().eq('id', task.id)
      return `🗑️ Undone: "${task.text}"`
    }
    case 'briefing': {
      const { generateDailyBriefing } = await import('@/features/ai/daily-briefing')
      const body = await generateDailyBriefing(db, userId)
      return `🌅 *Your Briefing:*\n\n${body}`
    }
    case 'digest': {
      const { generateWeeklyDigest } = await import('@/features/ai/weekly-digest')
      const body = await generateWeeklyDigest(db, userId)
      return `📊 *Weekly Digest:*\n\n${body}`
    }
    case 'monthly_digest': {
      const { generateMonthlyDigest } = await import('@/features/ai/weekly-digest')
      const body = await generateMonthlyDigest(db, userId)
      return `📅 *Monthly Digest:*\n\n${body}`
    }
    case 'set_reminder': {
      const slot = action.slot === 'evening' ? 'evening' : 'morning'
      const { error } = await db.from('reminders').insert({ user_id: userId, module: 'planner', label: String(action.label), slot })
      if (error) return `❌ ${error.message}`
      return `🔔 Reminder set for every ${slot}: "${action.label}"`
    }
    case 'list_reminders': {
      const { data } = await db.from('reminders').select('label, slot').eq('user_id', userId).eq('active', true)
      if (!data?.length) return 'No reminders set. Try "remind me to log my weight every morning"'
      return `🔔 *Your reminders:*\n` + data.map(r => `${r.slot === 'morning' ? '🌅' : '🌙'} ${r.label}`).join('\n')
    }
    case 'delete_reminder': {
      const { data } = await db.from('reminders').select('id, label').eq('user_id', userId).eq('active', true).ilike('label', `%${action.search}%`).limit(1)
      const reminder = data?.[0]
      if (!reminder) return `❌ No reminder matching "${action.search}"`
      await db.from('reminders').delete().eq('id', reminder.id)
      return `🗑️ Removed reminder: "${reminder.label}"`
    }
    default:
      return `*Planner Bot — What I can do:*\n• "add buy groceries high priority"\n• "show pending tasks"\n• "done with buy groceries"\n• "delete buy groceries"\n• "add call dentist due 2026-07-10"\n• "undo that"\n• "how am I doing" (briefing)\n• "how was my week" (digest)\n• "how was my month" (monthly digest)\n• "remind me to log weight every morning"\n• "show my reminders"`
  }
}
