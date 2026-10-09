import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'
import { undoButton } from '@/lib/telegram/buttons'
import { todayIST } from '@/lib/date'

// Career bot — Interviews (v3.4): companies are added once a phone screen
// happens; rounds get scheduled; every question an interviewer asks is
// logged. (Applied-stage tracking, job alerts and pipeline summaries were
// removed 2026-10-08.)
export const SYSTEM_PROMPT = `You are the Career (Interviews) bot for Personal OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"add_company","company":"name","role":"job title","stage":"screening"|"interview","notes":"optional"}
{"action":"update_stage","search":"company","stage":"screening"|"interview"|"offer"|"rejected"|"withdrawn"}
{"action":"schedule_round","search":"company","kind":"recruiter"|"phone_screen"|"technical"|"coding"|"system_design"|"behavioral"|"hiring_manager"|"onsite"|"other","when":"YYYY-MM-DDTHH:mm in IST, or null","interviewer":"optional"}
{"action":"log_question","search":"company","question":"the question they asked","category":"technical"|"coding"|"system_design"|"behavioral"|"ai_native"|"other","went":"well"|"ok"|"badly"|null,"my_answer":"optional"}
{"action":"upcoming"}
{"action":"questions","search":"company or empty for all"}
{"action":"undo_last"}
{"action":"help"}

Rules:
- "X booked a phone screen", "got a call from X recruiter for Senior FE" → add_company with stage "screening"
- "X moved me to onsite / next round" → update_stage "interview"; "rejected by X" → update_stage "rejected"; "got an offer from X" → "offer"
- "X technical round Thursday 3pm", "system design with X tomorrow 11am" → schedule_round (resolve relative dates against today's date; time in IST)
- "X asked me ...", "they asked about event loop at X, went badly" → log_question; a message listing several questions → one log_question per question
- "what's coming up", "my interviews" → upcoming; "what did X ask me" → questions
- "undo that" → undo_last`

const STAGE_EMOJI: Record<string, string> = { screening: '📞', interview: '🎯', offer: '🎉', rejected: '❌', withdrawn: '↩️', applied: '📨' }
const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

async function findCompany(db: SupabaseClient, userId: string, search: unknown) {
  const { data } = await db.from('applications').select('id, company, role, status').eq('user_id', userId)
    .ilike('company', `%${String(search ?? '').trim()}%`).order('created_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    case 'add_company': {
      const stage = action.stage === 'interview' ? 'interview' : 'screening'
      const { data, error } = await db.from('applications')
        .insert({ user_id: userId, company: action.company, role: action.role ?? 'Frontend Engineer', status: stage, notes: action.notes ?? null, applied_at: todayIST() })
        .select('id').single()
      if (error) return `❌ ${error.message}`
      return { text: `${STAGE_EMOJI[stage]} Added *${action.company}* — ${action.role ?? 'Frontend Engineer'} (${stage === 'screening' ? 'phone screen' : 'interviewing'}).\nTell me when a round is booked, and what they ask.`, buttons: [[undoButton('applications', data.id)]] }
    }
    case 'update_stage': {
      const app = await findCompany(db, userId, action.search)
      if (!app) return `❌ No company matching "${action.search}"`
      await db.from('applications').update({ status: action.stage }).eq('id', app.id)
      return `${STAGE_EMOJI[String(action.stage)] ?? '•'} *${app.company}* → ${action.stage}`
    }
    case 'schedule_round': {
      const app = await findCompany(db, userId, action.search)
      if (!app) return `❌ No company matching "${action.search}" — add it first ("X booked a phone screen").`
      const when = typeof action.when === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(action.when) ? new Date(`${action.when}:00+05:30`).toISOString() : null
      const kind = String(action.kind ?? 'technical')
      const { data, error } = await db.from('interview_rounds')
        .insert({ user_id: userId, application_id: app.id, kind, scheduled_at: when, interviewer: action.interviewer ?? null })
        .select('id').single()
      if (error) return `❌ ${error.message}`
      if (kind !== 'recruiter' && kind !== 'phone_screen' && app.status === 'screening') await db.from('applications').update({ status: 'interview' }).eq('id', app.id)
      return { text: `📅 *${app.company}* — ${kind.replace(/_/g, ' ')} round${when ? ` on ${fmt(when)}` : ' (no time yet)'}.\nPrep: Prep → Interviews page has guidance and priority topics.`, buttons: [[undoButton('interview_rounds', data.id)]] }
    }
    case 'log_question': {
      const app = await findCompany(db, userId, action.search)
      if (!app) return `❌ No company matching "${action.search}"`
      const went = ['well', 'ok', 'badly'].includes(String(action.went)) ? action.went : null
      const { data, error } = await db.from('interview_questions')
        .insert({ user_id: userId, application_id: app.id, question: String(action.question), category: action.category ?? 'technical', went, my_answer: action.my_answer ?? null })
        .select('id').single()
      if (error) return `❌ ${error.message}`
      return { text: `📝 Logged for *${app.company}*: "${action.question}"${went ? ` (${went})` : ''}`, buttons: [[undoButton('interview_questions', data.id)]] }
    }
    case 'upcoming': {
      const [{ data: rounds }, { data: active }] = await Promise.all([
        db.from('interview_rounds').select('kind, scheduled_at, application:applications(company)').eq('user_id', userId).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(8),
        db.from('applications').select('company, status').eq('user_id', userId).in('status', ['screening', 'interview', 'offer']),
      ])
      const rs = (rounds ?? []) as unknown as { kind: string; scheduled_at: string; application: { company: string } | null }[]
      return `📅 *Upcoming rounds:*\n${rs.length ? rs.map(r => `• ${fmt(r.scheduled_at)} — *${r.application?.company}* ${r.kind.replace(/_/g, ' ')}`).join('\n') : '_none scheduled_'}` +
        `\n\n🎯 *Active:* ${(active ?? []).map(a => `${STAGE_EMOJI[a.status]} ${a.company}`).join(', ') || 'none'}`
    }
    case 'questions': {
      const app = action.search ? await findCompany(db, userId, action.search) : null
      let q = db.from('interview_questions').select('question, went, application:applications(company)').eq('user_id', userId).order('created_at', { ascending: false }).limit(12)
      if (app) q = q.eq('application_id', app.id)
      const { data } = await q
      const rows = (data ?? []) as unknown as { question: string; went: string | null; application: { company: string } | null }[]
      if (!rows.length) return app ? `Nothing logged for *${app.company}* yet.` : 'No interview questions logged yet.'
      return `📝 *Questions asked${app ? ` at ${app.company}` : ''}:*\n` + rows.map(r => `• ${r.went === 'badly' ? '🔴 ' : r.went === 'well' ? '🟢 ' : ''}${r.question}${app ? '' : ` _(${r.application?.company})_`}`).join('\n')
    }
    case 'undo_last': {
      const { data } = await db.from('interview_questions').select('id, question, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const { data: apps } = await db.from('applications').select('id, company, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      const q = data?.[0], a = apps?.[0]
      if (q && (!a || q.created_at > a.created_at)) { await db.from('interview_questions').delete().eq('id', q.id); return `🗑️ Removed question: "${q.question}"` }
      if (a) { await db.from('applications').delete().eq('id', a.id); return `🗑️ Removed *${a.company}*` }
      return '❌ Nothing to undo.'
    }
    default:
      return `*Career Bot — Interviews:*\n• "Stripe booked a phone screen for Senior FE"\n• "Stripe technical round Thursday 3pm"\n• "Stripe asked me to design an autocomplete, went badly"\n• "Stripe moved me to onsite" / "rejected by Stripe"\n• "what's coming up"\n• "what did Stripe ask me"`
  }
}
