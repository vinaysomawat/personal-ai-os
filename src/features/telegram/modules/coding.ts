import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'
import { generateAssignmentForUser, getTodayAssignmentRows } from '@/features/coding/daily-core'

export const SYSTEM_PROMPT = `You are the Coding bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"today_question"}
{"action":"complete_question","search":"partial question title"}
{"action":"help"}

Rules:
- For "today's question", "what's my coding challenge" → today_question
- For "solved X", "finished X", "done with X" → complete_question`

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'today_question': {
      const rows = await generateAssignmentForUser(db, userId)
      if (rows.length === 0) return `🧘 No new questions today — it's a revision day (or your pool is empty).`
      const DE: Record<string, string> = { easy: '🟢', medium: '🟡', hard: '🔴' }
      return `💻 *Today's Coding Challenge:*\n\n` + rows.map(r =>
        `${r.completed ? '✅' : DE[r.question.difficulty] ?? ''} *${r.question.title}* _(${r.question.difficulty})_${r.completed ? ' — done' : ''}\n${r.question.url}`
      ).join('\n\n')
    }
    case 'complete_question': {
      const rows = await getTodayAssignmentRows(db, userId)
      const search = String(action.search ?? '').toLowerCase()
      const match = rows.find(r => r.question.title.toLowerCase().includes(search) || search.includes(r.question.title.toLowerCase()))
      if (!match) return `❌ No question matching "${action.search}" in today's assignment.`
      if (match.completed) return `Already marked *${match.question.title}* as done! 🎉`
      await db.from('coding_daily_questions').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', match.id)
      if (match.task_id) await db.from('tasks').update({ done: true }).eq('id', match.task_id)
      return `🎉 Nice work! Marked *${match.question.title}* as solved.`
    }
    default:
      return `*Coding Bot — What I can do:*\n• "today's question"\n• "solved Two Sum"`
  }
}
