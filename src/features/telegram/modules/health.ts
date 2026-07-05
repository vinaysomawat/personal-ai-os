import type { SupabaseClient } from '@supabase/supabase-js'

export const SYSTEM_PROMPT = `You are the Health bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"log_habit","name":"habit name"}
{"action":"list_habits"}
{"action":"add_habit","name":"habit name","emoji":"single emoji"}
{"action":"today_summary"}
{"action":"log_metric","metric":"weight_kg|calories|protein_g|sleep_hours|steps|water_ml","value":number}
{"action":"today_metrics"}
{"action":"help"}

Rules for log_metric:
- "weight 88kg" or "I weigh 88" → {"action":"log_metric","metric":"weight_kg","value":88}
- "slept 7.5 hours" or "sleep 7h30" → {"action":"log_metric","metric":"sleep_hours","value":7.5}
- "8000 steps" or "walked 10k steps" → {"action":"log_metric","metric":"steps","value":8000}
- "ate 2000 calories" or "2000 kcal today" → {"action":"log_metric","metric":"calories","value":2000}
- "120g protein" or "protein 130" → {"action":"log_metric","metric":"protein_g","value":120}
- "2 liters water" or "drank 1.5L" → convert to ml: {"action":"log_metric","metric":"water_ml","value":2000}

Rules for habits:
- If user says "I ran", "went for a run", "did my run" → log_habit with name "Run"
- If user says "meditated", "did meditation" → log_habit with name "Meditation"
- Match to existing habit names; don't create new habits unless action is add_habit
- For add_habit, pick a relevant emoji if not specified

Always return valid JSON only. No explanation.`

const METRIC_LABELS: Record<string, { label: string; unit: string; emoji: string }> = {
  weight_kg:   { label: 'Weight',   unit: 'kg',   emoji: '⚖️' },
  calories:    { label: 'Calories', unit: 'kcal', emoji: '🔥' },
  protein_g:   { label: 'Protein',  unit: 'g',    emoji: '🥩' },
  sleep_hours: { label: 'Sleep',    unit: 'hrs',  emoji: '😴' },
  steps:       { label: 'Steps',    unit: '',     emoji: '👟' },
  water_ml:    { label: 'Water',    unit: 'ml',   emoji: '💧' },
}

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  switch (action.action) {
    case 'log_metric': {
      const metric = String(action.metric)
      const value = Number(action.value)
      if (!METRIC_LABELS[metric] || isNaN(value)) return `❌ Invalid metric or value.`
      const { error } = await db.from('health_metrics').upsert(
        { user_id: userId, date: today, [metric]: value },
        { onConflict: 'user_id,date' }
      )
      if (error) return `❌ ${error.message}`
      const m = METRIC_LABELS[metric]
      return `${m.emoji} Logged *${m.label}*: ${value}${m.unit ? ' ' + m.unit : ''} today!`
    }

    case 'today_metrics': {
      const { data } = await db.from('health_metrics').select('*').eq('user_id', userId).eq('date', today).single()
      if (!data) return `No metrics logged yet for today. Try: "weight 88kg", "slept 7 hours", "8000 steps"`
      const lines = Object.entries(METRIC_LABELS)
        .filter(([field]) => data[field] !== null && data[field] !== undefined)
        .map(([field, m]) => `${m.emoji} ${m.label}: *${data[field]}${m.unit ? ' ' + m.unit : ''}*`)
      return lines.length
        ? `📊 *Today's Health Metrics:*\n\n${lines.join('\n')}`
        : `No metrics logged today yet.`
    }

    case 'log_habit': {
      const { data: habits } = await db.from('habits').select('id, name, icon').eq('user_id', userId)
      const search = String(action.name).toLowerCase()
      const habit = habits?.find(h => h.name.toLowerCase().includes(search) || search.includes(h.name.toLowerCase()))
      if (!habit) return `❌ No habit matching "${action.name}". Existing:\n${habits?.map(h => `${h.icon} ${h.name}`).join('\n') ?? 'None'}`
      const { error } = await db.from('habit_logs').insert({ user_id: userId, habit_id: habit.id, date: today })
      if (error?.code === '23505') return `Already logged *${habit.icon} ${habit.name}* today!`
      if (error) return `❌ ${error.message}`
      return `${habit.icon} Logged *${habit.name}* for today! 🔥`
    }

    case 'list_habits': {
      const { data: habits } = await db.from('habits').select('id, name, icon').eq('user_id', userId)
      if (!habits?.length) return 'No habits yet. Add one with "add habit [name]"'
      const { data: logs } = await db.from('habit_logs').select('habit_id, date').eq('user_id', userId).gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
      const doneToday = new Set(logs?.filter(l => l.date === today).map(l => l.habit_id))
      return `*Your habits:*\n` + habits.map(h => `${h.icon} ${h.name} ${doneToday.has(h.id) ? '✅' : '○'}`).join('\n')
    }

    case 'add_habit': {
      const { error } = await db.from('habits').insert({ user_id: userId, name: action.name, icon: action.emoji ?? '⭐' })
      if (error) return `❌ ${error.message}`
      return `${action.emoji ?? '⭐'} Added habit: *${action.name}*`
    }

    case 'today_summary': {
      const { data: habits } = await db.from('habits').select('id, name, icon').eq('user_id', userId)
      if (!habits?.length) return 'No habits yet.'
      const { data: logs } = await db.from('habit_logs').select('habit_id').eq('user_id', userId).eq('date', today)
      const done = new Set(logs?.map(l => l.habit_id))
      const doneList = habits.filter(h => done.has(h.id))
      const pendingList = habits.filter(h => !done.has(h.id))
      return `📊 *Today's Progress: ${done.size}/${habits.length}*\n\n` +
        (doneList.length ? `✅ Done:\n${doneList.map(h => `${h.icon} ${h.name}`).join('\n')}\n\n` : '') +
        (pendingList.length ? `○ Pending:\n${pendingList.map(h => `${h.icon} ${h.name}`).join('\n')}` : '')
    }

    default:
      return `*Health Bot — What I can do:*\n\n` +
        `📊 *Metrics:*\n• "weight 88kg"\n• "slept 7.5 hours"\n• "8000 steps"\n• "2000 calories"\n• "120g protein"\n• "2L water"\n• "today's metrics"\n\n` +
        `💪 *Habits:*\n• "logged my run"\n• "did meditation"\n• "show habits"\n• "today's summary"\n• "add habit Journaling 📔"`
  }
}
