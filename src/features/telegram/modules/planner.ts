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
{"action":"fight","area":"the boss named after fight/start, e.g. system design, react, backend"|null}
{"action":"fix_read"}
{"action":"prep_now"}
{"action":"drill","category":"system design"|"behavioral"|"interview"|"ai"|"angular"|"theory"|"backend"|"resume"|"architecture"|null}
{"action":"help"}

Rules:
- For "how was my week", "weekly digest", "weekly review" → digest
- For "how was my month", "monthly digest", "monthly review" → monthly_digest
- For "remind me to X every morning/day" → set_reminder with slot "morning"
- For "remind me to X every evening/night" → set_reminder with slot "evening"
- Reminders only fire at the two existing daily windows (~8:30am and ~8pm IST) — not arbitrary times
- For "fight", "FIGHT", "start", "begin", "let's go", "fight system design", "fight react" → fight (area = the words after fight/start, or null) — a Prep Boss Ladder fight
- For "read", "READ", "read fix", "fix read", "done reading" → fix_read (marks the last lost fight's Fix card read)
- For "what now", "what should I do", "status", "next" → prep_now
- For "drill", "DRILL", "drill me", "drill system design", "drill behavioral", "drill interview", "drill backend", "drill resume", "drill architecture" → drill (category = the words after "drill", or null)
- If message is unclear, return {"action":"help"}`

// Runs before intent parsing: while a Boss Ladder fight is running every
// message is its next answer; a message within 30 min of a drill question is
// that drill's answer (voice or text), not a command.
export async function preIntercept(text: string, db: SupabaseClient, userId: string, spoken: boolean): Promise<string | null> {
  const { answerTelegramFight } = await import('@/features/prep/fight')
  const fight = await answerTelegramFight(db, userId, text, spoken)
  if (fight !== null) return fight
  const { answerPendingDrill } = await import('@/features/prep/drill')
  return answerPendingDrill(db, userId, text, spoken)
}

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  switch (action.action) {
    // Boss Ladder fights (same rows as the web).
    case 'fight': {
      const { fightArea, startTelegramFight } = await import('@/features/prep/fight')
      return startTelegramFight(db, userId, fightArea(action.area ? String(action.area) : undefined))
    }
    case 'fix_read': {
      const { readTelegramFix } = await import('@/features/prep/fight')
      return readTelegramFix(db, userId)
    }
    case 'prep_now': {
      const { coachData, middayMessage, morningMessage } = await import('@/features/prep/coach')
      const data = await coachData(db, userId)
      if (!data) return 'Couldn\'t load today\'s plan — open the Prep page once.'
      return middayMessage(data) ?? morningMessage(data)
    }
    case 'drill': {
      const { drillCategory, startDrill } = await import('@/features/prep/drill')
      return startDrill(db, userId, drillCategory(action.category ? String(action.category) : undefined))
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
      return `*Daily Bot — What I can do:*\n• "how was my week" (digest)\n• "how was my month" (monthly digest)\n• "remind me to log weight every morning"\n• "show my reminders"\n• "fight" / "fight system design" (a Boss Ladder fight: 5 spoken answers, graded at the end; "skip" gives up) · "read" (Fix card read, rematch unlocked)\n• "what now" (today\'s fights)\n• "drill" / "drill system design" / "drill behavioral" / "drill backend" / "drill resume" / "drill architecture" / "drill interview" (a spoken-answer rep, rated)\n\nI also send the Prep Coach: the 7:30am fights, a 1pm nudge if none is done, and the 9:30pm review (with your reminders and anything still open).`
  }
}
