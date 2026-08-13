import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'
import { todayIST } from '@/lib/date'

// Read-mostly bot (astrology.md 3.5) — this module's data has no
// logging/CRUD equivalent to expenses or tasks, so there's no add/undo
// surface, just a push (see the astrology-daily cron) plus these read
// commands.
export const SYSTEM_PROMPT = `You are the Astrology bot for Personal OS. Parse the user message and return ONLY a JSON action.

Actions:
{"action":"reading","period":"daily"|"monthly"|"yearly"}
{"action":"current_dasha"}
{"action":"panchang"}
{"action":"characteristics"}
{"action":"help"}

Rules:
- For "today's reading", "what does today look like", "horoscope today" → reading, period "daily"
- For "this month's reading", "monthly horoscope", "outlook this month" → reading, period "monthly"
- For "this year's reading", "yearly horoscope", "outlook this year" → reading, period "yearly"
- For "current dasha", "what dasha am I in", "my dasha period" → current_dasha
- For "today's panchang", "tithi today", "panchang", "rahu kalam" → panchang
- For "my characteristics", "about my chart", "what am I like" → characteristics
- Default to reading with period "daily" if the message is vague but clearly astrology-related`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const PERIOD_LABEL: Record<string, string> = { daily: "Today's", monthly: "This Month's", yearly: "This Year's" }

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  const { data: profile } = await db.from('astrology_profile').select('*').eq('user_id', userId).maybeSingle()
  if (!profile) return `🔮 No birth chart yet — add your birth details on the Astrology page first.`

  switch (action.action) {
    case 'reading': {
      const { getAstrologyReading } = await import('@/features/astrology/actions')
      const period = ((action.period as string) === 'monthly' || (action.period as string) === 'yearly') ? (action.period as 'monthly' | 'yearly') : 'daily'
      const text = await getAstrologyReading(profile, period)
      return `🔮 *${PERIOD_LABEL[period]} Reading*\n\n${text}`
    }
    case 'current_dasha': {
      const { getCurrentDasha, getCurrentYogini } = await import('@/features/astrology/chart-calculations')
      const today = todayIST()
      const dasha = getCurrentDasha(profile.natal_chart.vimshottariDasha, today)
      const yogini = getCurrentYogini(profile.natal_chart.yoginiDasha, today)
      if (!dasha) return `🔮 No active dasha period found.`
      let text = `🔮 *Current Dasha*\n\n${dasha.mahadasha.lord} Mahadasha / ${dasha.antardasha.lord} Antardasha\nuntil ${formatDate(dasha.antardasha.endDate)}`
      if (yogini) text += `\n\nYogini: ${yogini.lord}, until ${formatDate(yogini.endDate)}`
      return text
    }
    case 'panchang': {
      const { getTodaysPanchang } = await import('@/features/astrology/panchang-actions')
      const panchang = await getTodaysPanchang(profile.birth_lat, profile.birth_lng, profile.birth_timezone)
      if (!panchang) return `🔮 Could not compute today's panchang.`
      return `🔮 *Today's Panchang*\n\nTithi: ${panchang.tithi} (${panchang.paksha} Paksha)\nNakshatra: ${panchang.nakshatra}\nYoga: ${panchang.yoga} · Karana: ${panchang.karana}\nSunrise: ${panchang.sunrise} · Sunset: ${panchang.sunset}\n\n⚠️ Rahu Kalam: ${panchang.rahu_kalam_start}–${panchang.rahu_kalam_end}\n⚠️ Yamaganda: ${panchang.yamaganda_start}–${panchang.yamaganda_end}\n⚠️ Gulika Kalam: ${panchang.gulika_kalam_start}–${panchang.gulika_kalam_end}`
    }
    case 'characteristics': {
      const { getAstrologyCharacteristics } = await import('@/features/astrology/actions')
      const text = await getAstrologyCharacteristics(profile)
      return `🔮 *Your Characteristics*\n\n${text}`
    }
    default:
      return `*Astrology Bot — What I can do:*\n• "today's reading"\n• "this month's reading"\n• "this year's reading"\n• "current dasha"\n• "today's panchang"\n• "my characteristics"`
  }
}
