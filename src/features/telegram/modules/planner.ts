import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

// The "Daily" bot. Module key stays 'planner' (it's the registered webhook
// path /api/telegram/planner and the TELEGRAM_BOT_TOKEN_PLANNER env var);
// the Planner module and its tasks were removed 2026-10-07. It now carries
// digests, reminders and the Prep Coach, and the crons post through it.
export const SYSTEM_PROMPT = `You are the Daily bot for Personal OS. Parse the user message and return ONLY a JSON action, nothing else.

Actions:
{"action":"digest"}
{"action":"monthly_digest"}
{"action":"set_reminder","label":"what to be reminded about","slot":"morning"|"evening"}
{"action":"list_reminders"}
{"action":"delete_reminder","search":"partial reminder text"}
{"action":"start_focus"}
{"action":"pause_focus"}
{"action":"finish_focus","finished":true|false}
{"action":"prep_now"}
{"action":"help"}

Rules:
- For "how was my week", "weekly digest", "weekly review" → digest
- For "how was my month", "monthly digest", "monthly review" → monthly_digest
- For "remind me to X every morning/day" → set_reminder with slot "morning"
- For "remind me to X every evening/night" → set_reminder with slot "evening"
- Reminders only fire at the two existing daily windows (~8:30am and ~8pm IST) — not arbitrary times
- For "start", "START", "begin", "let's go", "start focus" → start_focus (Prep War Mode focus session on the next block)
- For "pause", "break", "resume", "back" → pause_focus (toggles pause)
- For "done", "finished", "finish", "block done" → finish_focus with finished true; "stop", "give up", "abandon" → finish_focus with finished false
- For "what now", "what should I do", "status", "next" → prep_now
- If message is unclear, return {"action":"help"}`

const mm = (s: number) => `${Math.floor(s / 60)}m`

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    // Prep War Mode focus sessions (same rows as the web timer).
    case 'start_focus': {
      const { startFocus } = await import('@/features/prep/core')
      const f = await startFocus(db, userId)
      if (!f) return '✅ Every block in today\'s plan is done.'
      const fresh = Date.now() - new Date(f.started_at).getTime() < 15_000
      return `${fresh ? '🔒 *Focus started*' : '⏱️ *Already focusing*'}: ${f.label} — ${f.planned_minutes} min planned.\nReply *DONE* when the block is finished, *PAUSE* for a break.`
    }
    case 'pause_focus': {
      const { getActiveFocus, toggleFocusPause } = await import('@/features/prep/core')
      const active = await getActiveFocus(db, userId)
      if (!active) return 'No focus session running. Reply *START* to begin the next block.'
      const f = await toggleFocusPause(db, userId, active.id)
      return f?.paused_at ? `⏸️ Paused *${f.label}*. Reply *RESUME* to continue.` : `▶️ Resumed *${active.label}*.`
    }
    case 'finish_focus': {
      const { getActiveFocus, endFocus } = await import('@/features/prep/core')
      const active = await getActiveFocus(db, userId)
      if (!active) return 'No focus session running.'
      const finished = action.finished !== false
      const { focus, session } = await endFocus(db, userId, active.id, finished)
      const next = session?.blocks.find(b => !b.done)
      return `${finished ? '✅ *Block done*' : '⏹️ *Stopped*'}: ${active.label}\nPlanned ${active.planned_minutes}m · focused ${mm(focus?.actual_seconds ?? 0)}${active.interruptions ? ` · ${active.interruptions} interruption${active.interruptions === 1 ? '' : 's'}` : ''}` +
        (next ? `\n\n👉 Next: *${next.label}* — ${next.minutes}m. Reply *START*.` : finished ? '\n\nThat was the last block today.' : '')
    }
    case 'prep_now': {
      const { coachData, middayMessage, morningMessage } = await import('@/features/prep/coach')
      const data = await coachData(db, userId)
      if (!data) return 'Job Hunt Mode is off — set a target date on the Prep page.'
      return middayMessage(data) ?? morningMessage(data)
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
      return `*Daily Bot — What I can do:*\n• "how was my week" (digest)\n• "how was my month" (monthly digest)\n• "remind me to log weight every morning"\n• "show my reminders"\n• "start" / "pause" / "done" (Prep focus sessions)\n• "what now" (today\'s War Mode mission)\n\nI also send the Prep Coach: the 7:30am mission, a 1pm nudge if you\'re behind, and the 9:30pm review (with your reminders and anything still open).`
  }
}
