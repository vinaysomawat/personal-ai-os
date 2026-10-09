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
{"action":"log_question","search":"company, or empty when replying to a debrief prompt","question":"the question they asked","category":"technical"|"coding"|"system_design"|"behavioral"|"ai_native"|"other","topic":"optional, e.g. JavaScript Fundamentals, React & State Management, TypeScript, System Design, UI Components, Algorithms, Performance, Behavioral","went":"well"|"ok"|"badly"|null,"my_answer":"optional"}
{"action":"add_outreach","company":"name or 'Various'","person":"optional","channel":"referral"|"linkedin"|"recruiter"|"application"|"other","count":1,"notes":"optional"}
{"action":"update_outreach","search":"person or company","status":"sent"|"replied"|"referred"|"screen"|"no_response"|"closed"}
{"action":"list_followups"}
{"action":"upcoming"}
{"action":"questions","search":"company or empty for all"}
{"action":"undo_last"}
{"action":"help"}

Rules:
- "X booked a phone screen", "got a call from X recruiter for Senior FE" → add_company with stage "screening"
- "X moved me to onsite / next round" → update_stage "interview"; "rejected by X" → update_stage "rejected"; "got an offer from X" → "offer"
- "X technical round Thursday 3pm", "system design with X tomorrow 11am" → schedule_round (resolve relative dates against today's date; time in IST)
- "X asked me ...", "they asked about event loop at X, went badly" → log_question; a message listing several questions (one per line, often a reply to "How did the X round go?") → one log_question per question, each with its own went; leave search empty if no company is named
- "messaged Priya at Stripe for a referral" → add_outreach channel referral, person Priya; "applied to 12 jobs today" → add_outreach company Various, channel application, count 12; "DM'd a recruiter at Vercel on LinkedIn" → channel linkedin
- "Priya replied", "Priya referred me", "Stripe recruiter called" → update_outreach (replied / referred / screen); "no response from X" → no_response
- "who do I need to follow up with", "follow-ups" → list_followups
- "what's coming up", "my interviews" → upcoming; "what did X ask me" → questions
- "undo that" → undo_last`

const STAGE_EMOJI: Record<string, string> = { screening: '📞', interview: '🎯', offer: '🎉', rejected: '❌', withdrawn: '↩️', applied: '📨' }
const addDays = (date: string, n: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

// Monday-start IST week.
export async function outreachThisWeek(db: SupabaseClient, userId: string): Promise<{ sent: number; target: number }> {
  const today = todayIST()
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const monday = addDays(today, -dow)
  const [{ data }, { data: settings }] = await Promise.all([
    db.from('outreach').select('count').eq('user_id', userId).gte('sent_at', monday),
    db.from('prep_settings').select('weekly_outreach_target').eq('user_id', userId).maybeSingle(),
  ])
  return { sent: (data ?? []).reduce((s, r) => s + (r.count ?? 1), 0), target: settings?.weekly_outreach_target ?? 15 }
}

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
      // A debrief reply often names no company: fall back to the most
      // recently debriefed round (last 48h). Questions attach to that round,
      // which is marked done.
      let app = action.search ? await findCompany(db, userId, action.search) : null
      const { data: debriefed } = await db.from('interview_rounds').select('id, application_id, application:applications(id, company, role, status)')
        .eq('user_id', userId).not('debrief_sent_at', 'is', null).gte('debrief_sent_at', new Date(Date.now() - 48 * 3600_000).toISOString())
        .order('scheduled_at', { ascending: false }).limit(5)
      const rounds = (debriefed ?? []) as unknown as { id: string; application_id: string; application: { id: string; company: string; role: string; status: string } | null }[]
      if (!app && rounds[0]?.application) app = rounds[0].application
      if (!app) return `❌ No company matching "${action.search ?? ''}" — say which company asked it.`
      const round = rounds.find(r => r.application_id === app!.id) ?? null
      const went = ['well', 'ok', 'badly'].includes(String(action.went)) ? action.went as 'well' | 'ok' | 'badly' : null
      const { data, error } = await db.from('interview_questions')
        .insert({ user_id: userId, application_id: app.id, round_id: round?.id ?? null, question: String(action.question), category: action.category ?? 'technical', topic: action.topic ?? null, went, my_answer: action.my_answer ?? null })
        .select('*').single()
      if (error) return `❌ ${error.message}`
      if (round) await db.from('interview_rounds').update({ status: 'done' }).eq('id', round.id).eq('status', 'scheduled')
      const { syncInterviewQuestionToBank } = await import('@/features/career/bank-sync')
      const bankId = await syncInterviewQuestionToBank(db, userId, data)
      return { text: `📝 Logged for *${app.company}*: "${action.question}"${went ? ` (${went})` : ''}${bankId && went !== 'well' ? '\n→ added to Prep — it leads tomorrow\'s plan' : ''}`, buttons: [[undoButton('interview_questions', data.id)]] }
    }
    case 'add_outreach': {
      const channel = ['referral', 'linkedin', 'recruiter', 'application', 'other'].includes(String(action.channel)) ? String(action.channel) : 'application'
      const count = Math.max(1, Math.round(Number(action.count) || 1))
      const followUp = channel === 'application' ? null : addDays(todayIST(), 5)
      const { data, error } = await db.from('outreach')
        .insert({ user_id: userId, company: String(action.company ?? 'Various'), person: action.person ?? null, channel, count, sent_at: todayIST(), follow_up_on: followUp, notes: action.notes ?? null })
        .select('id').single()
      if (error) return `❌ ${error.message}`
      const week = await outreachThisWeek(db, userId)
      return { text: `📤 Logged ${count > 1 ? `${count} ` : ''}${channel}${action.person ? ` to *${action.person}*` : ''} at *${action.company ?? 'Various'}*${followUp ? `\nFollow up on ${followUp}` : ''}\nOutreach this week: *${week.sent}/${week.target}*`, buttons: [[undoButton('outreach', data.id)]] }
    }
    case 'update_outreach': {
      const q = String(action.search ?? '').trim()
      const { data } = await db.from('outreach').select('id, company, person').eq('user_id', userId)
        .or(`person.ilike.%${q}%,company.ilike.%${q}%`).order('sent_at', { ascending: false }).limit(1)
      const row = data?.[0]
      if (!row) return `❌ No outreach matching "${q}"`
      await db.from('outreach').update({ status: action.status }).eq('id', row.id)
      return `✅ ${row.person ?? row.company} → ${String(action.status).replace('_', ' ')}`
    }
    case 'list_followups': {
      const { data } = await db.from('outreach').select('company, person, channel, follow_up_on').eq('user_id', userId)
        .in('status', ['sent']).not('follow_up_on', 'is', null).lte('follow_up_on', todayIST()).order('follow_up_on')
      if (!data?.length) return '✅ No follow-ups due.'
      return `📬 *Follow-ups due:*\n` + data.map(o => `• ${o.person ? `*${o.person}* · ` : ''}${o.company} (${o.channel}, due ${o.follow_up_on})`).join('\n')
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
      return `*Career Bot — Interviews:*\n• "Stripe booked a phone screen for Senior FE"\n• "Stripe technical round Thursday 3pm"\n• "Stripe asked me to design an autocomplete, went badly"\n• "Stripe moved me to onsite" / "rejected by Stripe"\n• "what's coming up"\n• "what did Stripe ask me"\n• "messaged Priya at Stripe for a referral" / "applied to 12 jobs today"\n• "Priya replied" / "follow-ups"`
  }
}
