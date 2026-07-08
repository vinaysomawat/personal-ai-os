import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Career bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"add_application","company":"name","role":"job title","status":"applied"|"screening"|"interview"|"offer"|"rejected","notes":"optional notes","applied_at":"YYYY-MM-DD"}
{"action":"update_status","search":"company or role","status":"applied"|"screening"|"interview"|"offer"|"rejected"}
{"action":"list_applications","filter":"all"|"applied"|"screening"|"interview"|"offer"|"rejected"}
{"action":"add_note","search":"company or role","note":"note text"}
{"action":"summary"}
{"action":"ask","question":"free-form career question"}
{"action":"help"}

Rules:
- Default applied_at: today's date
- If user says "I applied to X" → add_application with status "applied"
- If user says "X called me for screening/interview" → update_status
- For readiness checks, salary questions, "should I take X", learning-path advice, or anything needing judgment → ask with the question`

const SC = { applied: '📨', screening: '🔍', interview: '🎯', offer: '🎉', rejected: '❌' } as Record<string, string>

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  const today = new Date().toISOString().split('T')[0]
  switch (action.action) {
    case 'add_application': {
      const { error } = await db.from('applications').insert({ user_id: userId, company: action.company, role: action.role, status: action.status ?? 'applied', notes: action.notes ?? null, applied_at: action.applied_at ?? today })
      if (error) return `❌ ${error.message}`
      return `${SC[String(action.status ?? 'applied')]} Added *${action.company}* — ${action.role}\nStatus: ${action.status ?? 'applied'}${action.notes ? `\nNote: ${action.notes}` : ''}`
    }
    case 'update_status': {
      const { data } = await db.from('applications').select('id, company, role').eq('user_id', userId).or(`company.ilike.%${action.search}%,role.ilike.%${action.search}%`).limit(1)
      const app = data?.[0]
      if (!app) return `❌ No application matching "${action.search}"`
      await db.from('applications').update({ status: action.status }).eq('id', app.id)
      return `${SC[String(action.status)]} Updated *${app.company}* (${app.role}) → ${action.status}`
    }
    case 'list_applications': {
      const filter = action.filter as string
      let q = db.from('applications').select('company, role, status, applied_at').eq('user_id', userId)
      if (filter && filter !== 'all') q = q.eq('status', filter)
      const { data } = await q.order('created_at', { ascending: false }).limit(10)
      if (!data?.length) return 'No applications found.'
      return `💼 *Applications:*\n` + data.map(a => `${SC[a.status] ?? '📨'} *${a.company}* — ${a.role} _(${a.status})_`).join('\n')
    }
    case 'add_note': {
      const { data } = await db.from('applications').select('id, company, notes').eq('user_id', userId).or(`company.ilike.%${action.search}%,role.ilike.%${action.search}%`).limit(1)
      const app = data?.[0]
      if (!app) return `❌ No application matching "${action.search}"`
      const newNotes = app.notes ? `${app.notes}\n${action.note}` : String(action.note)
      await db.from('applications').update({ notes: newNotes }).eq('id', app.id)
      return `📝 Note added to *${app.company}*`
    }
    case 'summary': {
      const { data } = await db.from('applications').select('status').eq('user_id', userId)
      if (!data?.length) return 'No applications yet.'
      const counts: Record<string, number> = {}
      data.forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1 })
      return `💼 *Pipeline Summary:*\n` + Object.entries(counts).map(([s, n]) => `${SC[s] ?? '📨'} ${s}: ${n}`).join('\n')
    }
    case 'ask': {
      const { askCareerMentor } = await import('@/features/ai/career-mentor')
      const [profileRes, skillsRes, appsRes] = await Promise.all([
        db.from('career_profile').select('*').eq('user_id', userId).single(),
        db.from('skills').select('*').eq('user_id', userId),
        db.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      const answer = await askCareerMentor(String(action.question), {
        profile: profileRes.data ?? null,
        skills: skillsRes.data ?? [],
        applications: appsRes.data ?? [],
      })
      return `🎓 *Career Mentor:*\n\n${answer}`
    }
    default:
      return `*Career Bot — What I can do:*\n• "applied to Google as Frontend Engineer"\n• "Google moved me to interview"\n• "show all applications"\n• "add note to Google: good culture fit"\n• "pipeline summary"\n• "am I ready for a staff role?"\n• "should I ask for 40 LPA?"`
  }
}
