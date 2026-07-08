import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Health bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"log_habit","name":"habit name"}
{"action":"list_habits"}
{"action":"add_habit","name":"habit name","emoji":"single emoji"}
{"action":"today_summary"}
{"action":"log_metric","metric":"weight_kg|calories|protein_g|sleep_hours|steps|water_ml|recovery_score","value":number}
{"action":"today_metrics"}
{"action":"log_workout","workoutType":"Strength"|"Cardio"|"Run"|"Yoga"|"Sports"|"Other","minutes":number}
{"action":"plan"}
{"action":"report"}
{"action":"help"}

Rules for log_metric:
- "weight 88kg" or "I weigh 88" → {"action":"log_metric","metric":"weight_kg","value":88}
- "slept 7.5 hours" or "sleep 7h30" → {"action":"log_metric","metric":"sleep_hours","value":7.5}
- "8000 steps" or "walked 10k steps" → {"action":"log_metric","metric":"steps","value":8000}
- "ate 2000 calories" or "2000 kcal today" → {"action":"log_metric","metric":"calories","value":2000}
- "120g protein" or "protein 130" → {"action":"log_metric","metric":"protein_g","value":120}
- "2 liters water" or "drank 1.5L" → convert to ml: {"action":"log_metric","metric":"water_ml","value":2000}
- "feeling recovered, 4/5" or "recovery 3" → {"action":"log_metric","metric":"recovery_score","value":3} (scale 1-5)

Rules for workouts:
- "did 45 min strength training", "went for a 30 min run" → log_workout (distinct from log_habit — use this for structured workout+duration, not the generic habit checkbox)

Rules for habits:
- If user says "I ran", "went for a run", "did my run" → log_habit with name "Run"
- If user says "meditated", "did meditation" → log_habit with name "Meditation"
- Match to existing habit names; don't create new habits unless action is add_habit
- For add_habit, pick a relevant emoji if not specified
- For "what should I do today", "today's plan", "am I on track" → plan
- For "how was my week", "weekly report" → report

Always return valid JSON only. No explanation.`

export const VISION_PROMPT = `You are the Health bot for Vinay AI OS, looking at a photo of a meal. Estimate calories and protein as best you can — give a reasonable estimate, don't refuse just because it's approximate. Return ONLY a JSON array:
[{"action":"log_metric","metric":"calories","value":<number>},{"action":"log_metric","metric":"protein_g","value":<number>}]
If the photo isn't food, return {"action":"help"}.`

const METRIC_LABELS: Record<string, { label: string; unit: string; emoji: string }> = {
  weight_kg:      { label: 'Weight',   unit: 'kg',   emoji: '⚖️' },
  calories:       { label: 'Calories', unit: 'kcal', emoji: '🔥' },
  protein_g:      { label: 'Protein',  unit: 'g',    emoji: '🥩' },
  sleep_hours:    { label: 'Sleep',    unit: 'hrs',  emoji: '😴' },
  steps:          { label: 'Steps',    unit: '',     emoji: '👟' },
  water_ml:       { label: 'Water',    unit: 'ml',   emoji: '💧' },
  recovery_score: { label: 'Recovery', unit: '/5',   emoji: '🔋' },
}

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
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

    case 'log_workout': {
      const workoutType = action.workoutType ? String(action.workoutType) : 'Other'
      const minutes = action.minutes ? Number(action.minutes) : null
      const { error } = await db.from('workouts').insert({ user_id: userId, type: workoutType, duration_minutes: minutes })
      if (error) return `❌ ${error.message}`
      return `🏋️ Logged *${workoutType}*${minutes ? ` — ${minutes} min` : ''}`
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

    case 'plan': {
      const { computeHealthPlan } = await import('@/features/health/calculations')
      const { getDailyHealthPlan } = await import('@/features/ai/health-report')
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

      const [profileRes, metricsRes, habitsRes, logsRes] = await Promise.all([
        db.from('health_profile').select('*').eq('user_id', userId).single(),
        db.from('health_metrics').select('*').eq('user_id', userId).gte('date', since30),
        db.from('habits').select('*').eq('user_id', userId),
        db.from('habit_logs').select('*').eq('user_id', userId).gte('date', since7),
      ])
      const habits = (habitsRes.data ?? []).map(h => ({ ...h, logs: (logsRes.data ?? []).filter(l => l.habit_id === h.id) }))
      const metrics = metricsRes.data ?? []
      const todayMetric = metrics.find(m => m.date === today) ?? null

      const result = computeHealthPlan(profileRes.data ?? null, metrics, habits, today)
      if (!result) return `❌ Set up your health profile on the web app first (age, gender, height, target weight, activity level) — needed to compute your plan.`

      const plan = await getDailyHealthPlan(profileRes.data, result.weightLossPlan, todayMetric, habits, result.healthScore, today)
      return `🏋️ *Today's Plan:*\n\n${plan}`
    }

    case 'report': {
      const { getHealthReport } = await import('@/features/ai/health-report')
      const since7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const { data: metrics } = await db.from('health_metrics').select('*').eq('user_id', userId).gte('date', since7).order('date', { ascending: false })
      const report = await getHealthReport(metrics ?? [])
      return `📋 *Weekly Report:*\n\n${report}`
    }

    default:
      return `*Health Bot — What I can do:*\n\n` +
        `📊 *Metrics:*\n• "weight 88kg"\n• "slept 7.5 hours"\n• "8000 steps"\n• "2000 calories"\n• "120g protein"\n• "2L water"\n• "recovery 4/5"\n• "today's metrics"\n\n` +
        `🏋️ *Workouts:*\n• "did 45 min strength training"\n• "30 min run"\n\n` +
        `💪 *Habits:*\n• "logged my run"\n• "did meditation"\n• "show habits"\n• "today's summary"\n• "add habit Journaling 📔"\n\n` +
        `🎓 *Coaching:*\n• "what should I do today"\n• "how was my week"`
  }
}
