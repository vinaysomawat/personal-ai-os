import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'

export const SYSTEM_PROMPT = `You are the Health bot for Vinay AI OS. Parse the user message and return ONLY a JSON action.

Actions:
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
- "did 45 min strength training", "went for a 30 min run", "I ran", "meditated for 20 min" → log_workout
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

    case 'plan': {
      const { computeHealthPlan } = await import('@/features/health/calculations')
      const { getDailyHealthPlan } = await import('@/features/ai/health-report')
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

      const [profileRes, metricsRes, workoutsRes] = await Promise.all([
        db.from('health_profile').select('*').eq('user_id', userId).single(),
        db.from('health_metrics').select('*').eq('user_id', userId).gte('date', since30),
        db.from('workouts').select('*').eq('user_id', userId).gte('date', since30),
      ])
      const workouts = workoutsRes.data ?? []
      const metrics = metricsRes.data ?? []
      const todayMetric = metrics.find(m => m.date === today) ?? null

      const result = computeHealthPlan(profileRes.data ?? null, metrics, workouts, today)
      if (!result) return `❌ Set up your health profile on the web app first (age, gender, height, activity level) — needed to compute your plan.`

      const plan = await getDailyHealthPlan(profileRes.data, result.dailyTargets, todayMetric, result.healthScore, today)
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
        `🎓 *Coaching:*\n• "what should I do today"\n• "how was my week"`
  }
}
