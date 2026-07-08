import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'
import { generateAssignmentForUser, getTodayAssignmentRows } from '@/features/coding/daily-core'

export const SYSTEM_PROMPT = `You are the Coding bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"add_project","name":"project name","description":"what it does","status":"idea"|"in-progress"|"paused"|"completed","work_type":"personal"|"office"|"oss","stack":["Next.js","Supabase"],"github_url":"https://github.com/... or null","live_url":"https://... or null"}
{"action":"update_status","search":"project name","status":"idea"|"in-progress"|"paused"|"completed"}
{"action":"list_projects","filter":"all"|"idea"|"in-progress"|"paused"|"completed","work_type":"personal"|"office"|"oss"|null}
{"action":"add_note","search":"project name","note":"note text"}
{"action":"today_question"}
{"action":"complete_question","search":"partial question title"}
{"action":"help"}

Rules:
- stack is an array of tech names extracted from the message
- Default status: "idea", default work_type: "personal"
- If user says "started working on X" → status "in-progress"
- If user says "office project", "at work", "for my job" → work_type "office"
- If user says "open source", "OSS", "contributing to X" → work_type "oss"
- For "show my office projects", "list personal projects" → list_projects with work_type filter
- For "today's question", "what's my coding challenge" → today_question
- For "solved X", "finished X", "done with X" (referring to a coding practice question, not a project) → complete_question`

const SE = { idea: '💡', 'in-progress': '⚡', paused: '⏸️', completed: '✅' } as Record<string, string>
const WE = { personal: '🌱', office: '💼', oss: '🌐' } as Record<string, string>

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'add_project': {
      const stack = Array.isArray(action.stack) ? action.stack : []
      const workType = action.work_type ?? 'personal'
      const { error } = await db.from('projects').insert({ user_id: userId, name: action.name, description: action.description ?? null, status: action.status ?? 'idea', work_type: workType, stack, github_url: action.github_url ?? null, live_url: action.live_url ?? null })
      if (error) return `❌ ${error.message}`
      return `${SE[String(action.status ?? 'idea')]} Added *${action.name}* ${WE[String(workType)]}\n${action.description ? action.description + '\n' : ''}Stack: ${stack.join(', ') || 'TBD'}`
    }
    case 'update_status': {
      const { data } = await db.from('projects').select('id, name').eq('user_id', userId).ilike('name', `%${action.search}%`).limit(1)
      const p = data?.[0]
      if (!p) return `❌ No project matching "${action.search}"`
      await db.from('projects').update({ status: action.status }).eq('id', p.id)
      return `${SE[String(action.status)]} *${p.name}* → ${action.status}`
    }
    case 'list_projects': {
      const filter = (action.filter as string) ?? 'all'
      let q = db.from('projects').select('name, status, work_type, stack, description').eq('user_id', userId)
      if (filter !== 'all') q = q.eq('status', filter)
      if (action.work_type) q = q.eq('work_type', action.work_type)
      const { data } = await q.order('created_at', { ascending: false }).limit(10)
      if (!data?.length) return `No ${filter === 'all' ? '' : filter + ' '}projects.`
      return `💻 *Projects:*\n` + data.map(p => `${SE[p.status] ?? '💡'} ${WE[p.work_type] ?? ''} *${p.name}* _(${p.stack?.slice(0, 2).join(', ') || 'TBD'})_`).join('\n')
    }
    case 'add_note': {
      const { data } = await db.from('projects').select('id, name, description').eq('user_id', userId).ilike('name', `%${action.search}%`).limit(1)
      const p = data?.[0]
      if (!p) return `❌ No project matching "${action.search}"`
      const newDesc = p.description ? `${p.description}\n${action.note}` : String(action.note)
      await db.from('projects').update({ description: newDesc }).eq('id', p.id)
      return `📝 Note added to *${p.name}*`
    }
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
      return `*Coding Bot — What I can do:*\n• "add project Portfolio with Next.js and Tailwind"\n• "add office project Internal Dashboard"\n• "started working on Portfolio"\n• "show in-progress projects"\n• "show my office projects"\n• "Portfolio is done"\n• "add note to Portfolio: deploy to Vercel next"\n• "today's question"\n• "solved Two Sum"`
  }
}
