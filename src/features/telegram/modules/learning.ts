import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Learning bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"add_resource","title":"name","type":"course"|"book"|"video"|"article"|"podcast","url":"https://... or null","category":"topic e.g. JavaScript","status":"not-started"|"in-progress"|"completed"}
{"action":"update_progress","search":"title","progress":75}
{"action":"complete","search":"title"}
{"action":"list_resources","filter":"all"|"in-progress"|"not-started"|"completed"|"needs-revision"}
{"action":"plan"}
{"action":"quiz","search":"partial resource title"}
{"action":"undo_last"}
{"action":"help"}

Rules:
- Default type: "course", default status: "not-started", default category: "General"
- If user says "started X", set status to "in-progress"
- If user says "finished X", use complete action
- For "what should I study today", "today's study plan" → plan
- For "what am I forgetting", "what needs revision" → list_resources with filter "needs-revision"
- For "quiz me on X", "test me on X", "flashcards for X" → quiz
- For "undo that", "remove the last one I added", "oops wrong resource" → undo_last`

const TE = { course: '🎓', book: '📚', video: '🎬', article: '📄', podcast: '🎙️' } as Record<string, string>

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'add_resource': {
      const { error } = await db.from('resources').insert({ user_id: userId, title: action.title, type: action.type ?? 'course', url: action.url ?? null, category: action.category ?? 'General', status: action.status ?? 'not-started', progress: 0, notes: null })
      if (error) return `❌ ${error.message}`
      const e = TE[String(action.type ?? 'course')] ?? '📖'
      return `${e} Added *${action.title}*\nType: ${action.type ?? 'course'} · ${action.category ?? 'General'} · ${action.status ?? 'not-started'}`
    }
    case 'update_progress': {
      const { data } = await db.from('resources').select('id, title').eq('user_id', userId).ilike('title', `%${action.search}%`).limit(1)
      const r = data?.[0]
      if (!r) return `❌ No resource matching "${action.search}"`
      const progress = Math.min(100, Math.max(0, Number(action.progress)))
      const status = progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started'
      await db.from('resources').update({ progress, status }).eq('id', r.id)
      return `📈 *${r.title}*: ${progress}% ${progress >= 100 ? '✅ Complete!' : ''}`
    }
    case 'complete': {
      const { data } = await db.from('resources').select('id, title').eq('user_id', userId).ilike('title', `%${action.search}%`).limit(1)
      const r = data?.[0]
      if (!r) return `❌ No resource matching "${action.search}"`
      await db.from('resources').update({ progress: 100, status: 'completed' }).eq('id', r.id)
      return `🎉 Completed: *${r.title}*!`
    }
    case 'list_resources': {
      const filter = (action.filter as string) ?? 'in-progress'

      if (filter === 'needs-revision') {
        const { getResourcesNeedingRevision } = await import('@/features/learning/calculations')
        const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
        const [resourcesRes, logsRes] = await Promise.all([
          db.from('resources').select('*').eq('user_id', userId),
          db.from('study_logs').select('*').eq('user_id', userId).gte('date', since),
        ])
        const stale = getResourcesNeedingRevision(resourcesRes.data ?? [], logsRes.data ?? [])
        if (!stale.length) return `✅ Nothing needs revision — everything completed has been revisited recently.`
        return `🔄 *Needs revision* _(completed, no activity in 14+ days)_:\n` +
          stale.map(r => `${TE[r.type] ?? '📖'} *${r.title}* _(${r.category})_`).join('\n')
      }

      let q = db.from('resources').select('title, type, status, progress, category').eq('user_id', userId)
      if (filter !== 'all') q = q.eq('status', filter)
      const { data } = await q.order('created_at', { ascending: false }).limit(10)
      if (!data?.length) return `No ${filter} resources.`
      return `📚 *${filter.charAt(0).toUpperCase() + filter.slice(1)}:*\n` +
        data.map(r => `${TE[r.type] ?? '📖'} *${r.title}* _(${r.category})_${r.status === 'in-progress' ? ` — ${r.progress}%` : ''}`).join('\n')
    }
    case 'plan': {
      const { getDailyStudyPlan } = await import('@/features/ai/study-plan')
      const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const [resourcesRes, logsRes] = await Promise.all([
        db.from('resources').select('*').eq('user_id', userId),
        db.from('study_logs').select('*').eq('user_id', userId).gte('date', since),
      ])
      const plan = await getDailyStudyPlan(resourcesRes.data ?? [], logsRes.data ?? [])
      return `📚 *Today's Study Plan:*\n\n${plan}`
    }
    case 'quiz': {
      const { data } = await db.from('resources').select('id, title, category, type, notes').eq('user_id', userId).ilike('title', `%${action.search}%`).limit(1)
      const r = data?.[0]
      if (!r) return `❌ No resource matching "${action.search}"`
      const { generateResourceQuiz } = await import('@/features/ai/study-plan')
      const questions = await generateResourceQuiz(r.title, r.category, r.type, r.notes)
      if (!questions.length) return `❌ Couldn't generate a quiz for *${r.title}* right now.`
      return `🧠 *Quiz — ${r.title}:*\n\n` + questions.map((q, i) => `*${i + 1}. ${q.question}*\n${q.answer}`).join('\n\n')
    }
    case 'undo_last': {
      const { data } = await db.from('resources').select('id, title').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const last = data?.[0]
      if (!last) return `❌ No recent resource to undo.`
      await db.from('resources').delete().eq('id', last.id)
      return `🗑️ Undone: *${last.title}*`
    }
    default:
      return `*Learning Bot — What I can do:*\n• "add Next.js course from Udemy"\n• "started JavaScript: The Good Parts book"\n• "update Next.js to 60%"\n• "finished React docs"\n• "show in-progress resources"\n• "what should I study today"\n• "quiz me on React hooks"\n• "undo that"`
  }
}
