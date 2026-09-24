import type { SupabaseClient } from '@supabase/supabase-js'
import type { ModuleReply } from '@/lib/telegram/types'
import { todayIST, nowISTHHMM } from '@/lib/date'
import { UI_HI, PLANET_HI, YOGINI_HI, YOGA_HI, KARANA_HI } from '@/features/astrology/i18n/hi'
import { formatDailyReading, bulletizeProse, formatPanchangLines } from '@/features/astrology/telegram-format'

// Read-mostly bot (astrology.md 3.5) — this module's data has no
// logging/CRUD equivalent to expenses or tasks, so there's no add/undo
// surface, just a push (see the astrology-daily cron) plus these read
// commands. Always replies in Hindi (2026-08-18, by direct request) — no
// per-user language setting exists (the web page's own EN/हिं toggle is
// client-only `localStorage`, unreachable here), so this isn't
// conditional, it's just how this bot always talks now. User-facing
// commands stay in English in SYSTEM_PROMPT below since the intent-parsing
// LLM call understands Hindi input the same as English regardless of what
// these example phrases are written in.
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

const MONTHS_HI = ['जन', 'फर', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्तू', 'नव', 'दिस']
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS_HI[m - 1]} ${y}`
}

const PERIOD_READING_KEY: Record<string, keyof typeof UI_HI> = {
  daily: 'todayReading', monthly: 'thisMonthReading', yearly: 'thisYearReading',
}

export async function execute(action: Record<string, unknown>, db: SupabaseClient, userId: string): Promise<ModuleReply> {
  const { data: profile } = await db.from('astrology_profile').select('*').eq('user_id', userId).maybeSingle()
  if (!profile) return `🔮 अभी तक कोई जन्म कुंडली नहीं है — पहले Astrology पेज पर अपना जन्म विवरण जोड़ें।`

  switch (action.action) {
    case 'reading': {
      const { getAstrologyReading, getStructuredDailyReading } = await import('@/features/astrology/actions')
      const period = ((action.period as string) === 'monthly' || (action.period as string) === 'yearly') ? (action.period as 'monthly' | 'yearly') : 'daily'
      // Bullets, not paragraphs: daily uses the structured reading; monthly/
      // yearly prose is split into ≤4 sentence bullets (same AI output/cache).
      const body = period === 'daily'
        ? formatDailyReading(await getStructuredDailyReading(profile, 'hi'))
        : bulletizeProse(await getAstrologyReading(profile, period, 'hi'), 4)
      return `🔮 *${UI_HI[PERIOD_READING_KEY[period]]}*\n\n${body}`
    }
    case 'current_dasha': {
      const { getCurrentDasha, getCurrentYogini } = await import('@/features/astrology/chart-calculations')
      const today = todayIST()
      const dasha = getCurrentDasha(profile.natal_chart.vimshottariDasha, today)
      const yogini = getCurrentYogini(profile.natal_chart.yoginiDasha, today)
      if (!dasha) return `🔮 कोई सक्रिय दशा अवधि नहीं मिली।`
      const mahaLord = PLANET_HI[dasha.mahadasha.lord as keyof typeof PLANET_HI] ?? dasha.mahadasha.lord
      const antarLord = PLANET_HI[dasha.antardasha.lord as keyof typeof PLANET_HI] ?? dasha.antardasha.lord
      let text = `🔮 *${UI_HI.currentDasha}*\n\n${mahaLord} ${UI_HI.mahadasha} / ${antarLord} ${UI_HI.antardasha}\n${formatDate(dasha.antardasha.endDate)} ${UI_HI.until}`
      if (yogini) {
        const yoginiLord = YOGINI_HI[yogini.lord as keyof typeof YOGINI_HI] ?? yogini.lord
        text += `\n\n${UI_HI.yoginiLabel}: ${yoginiLord}, ${formatDate(yogini.endDate)} ${UI_HI.until}`
      }
      return text
    }
    case 'panchang': {
      const { getTodaysPanchang } = await import('@/features/astrology/panchang-actions')
      const panchang = await getTodaysPanchang(profile.birth_lat, profile.birth_lng, profile.birth_timezone)
      if (!panchang) return `🔮 आज का पंचांग नहीं निकाला जा सका।`
      const yoga = YOGA_HI[panchang.yoga] ?? panchang.yoga
      const karana = KARANA_HI[panchang.karana] ?? panchang.karana
      const text = `🔮 *${UI_HI.panchang}*\n\n${formatPanchangLines(panchang, nowISTHHMM(), true)}\n🧿 ${UI_HI.yoga}: ${yoga} · ${UI_HI.karana}: ${karana}`
      return text
    }
    case 'characteristics': {
      const { getAstrologyCharacteristics } = await import('@/features/astrology/actions')
      // Returns { text, generatedAt } — interpolating the object directly
      // used to send "[object Object]".
      const { text } = await getAstrologyCharacteristics(profile, 'hi')
      return `🔮 *${UI_HI.characteristics}*\n\n${bulletizeProse(text, 5)}`
    }
    default:
      return `*ज्योतिष बॉट — मैं यह कर सकता हूँ:*\n• "today's reading"\n• "this month's reading"\n• "this year's reading"\n• "current dasha"\n• "today's panchang"\n• "my characteristics"`
  }
}
