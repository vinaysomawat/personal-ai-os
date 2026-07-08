import type { SupabaseClient } from '@supabase/supabase-js'

export type ReminderSlot = 'morning' | 'evening'

export async function getReminderLines(db: SupabaseClient, userId: string, slot: ReminderSlot): Promise<string> {
  const { data } = await db.from('reminders').select('label').eq('user_id', userId).eq('slot', slot).eq('active', true)
  if (!data || data.length === 0) return ''
  return `\n\n🔔 *Reminders:*\n` + data.map(r => `• ${r.label}`).join('\n')
}
