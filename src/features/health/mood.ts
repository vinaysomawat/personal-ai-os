import type { SupabaseClient } from '@supabase/supabase-js'
import { daysAgoIST, todayIST } from '@/lib/date'

// Nightly mood / energy check-in (v4.2) — plain server module, all
// deterministic: the 9:30pm coach asks, the Daily bot parses the reply with a
// regex (no AI intent call), the Dashboard draws 14 days, and the morning
// coach adds one gentle line when mood has been low most of the week.

export interface MoodLog { date: string; mood: number; energy: number; note: string | null }

export const MOOD_PROMPT = 'Mood and energy today? Reply e.g. *mood 3 energy 4* (1–5, a note after is fine).'

// "mood 3 energy 4", "mood: 2, energy 3 — long day", "energy 4 mood 3".
const MOOD_FIRST = /^\s*mood\s*[:=]?\s*([1-5])\s*[,/;]?\s*energy\s*[:=]?\s*([1-5])\b[\s,.;:—-]*(.*)$/i
const ENERGY_FIRST = /^\s*energy\s*[:=]?\s*([1-5])\s*[,/;]?\s*mood\s*[:=]?\s*([1-5])\b[\s,.;:—-]*(.*)$/i
export function parseMood(text: string): { mood: number; energy: number; note: string | null } | null {
  const m = text.match(MOOD_FIRST)
  if (m) return { mood: Number(m[1]), energy: Number(m[2]), note: m[3].trim() || null }
  const e = text.match(ENERGY_FIRST)
  if (e) return { mood: Number(e[2]), energy: Number(e[1]), note: e[3].trim() || null }
  return null
}

// Daily bot preIntercept: a check-in reply is saved for today (IST); the
// last reply of the day wins. null = not a check-in.
export async function logMoodReply(db: SupabaseClient, userId: string, text: string): Promise<string | null> {
  const parsed = parseMood(text)
  if (!parsed) return null
  const { error } = await db.from('mood_logs').upsert({ user_id: userId, date: todayIST(), ...parsed }, { onConflict: 'user_id,date' })
  if (error) return `❌ ${error.message}`
  return `✓ Logged — mood ${parsed.mood}/5, energy ${parsed.energy}/5. Sleep well.`
}

export async function getMoodLogs(db: SupabaseClient, userId: string, days = 14): Promise<MoodLog[]> {
  const { data } = await db.from('mood_logs').select('date, mood, energy, note').eq('user_id', userId)
    .gte('date', daysAgoIST(days - 1)).order('date', { ascending: true })
  return (data ?? []) as MoodLog[]
}

// Mood ≤ 2 on at least 5 of the last 7 days (days without a log don't count).
export function moodLowStreak(logs: MoodLog[]): boolean {
  const since = daysAgoIST(6)
  return logs.filter(l => l.date >= since && l.mood <= 2).length >= 5
}

export const LOW_MOOD_LINE = '💙 Mood has been low most of this week. Talking to a friend today could help — or call Tele-MANAS on *14416* (free, 24×7).'
