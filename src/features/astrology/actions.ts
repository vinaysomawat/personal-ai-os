'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { todayIST, istMidnightUtc, istDateStrToUtcMidnight } from '@/lib/date'
import { getPlanetPositions, getAscendant, julianDay, julianDayNow } from './ephemeris'
import { buildPlanetPositions, getRashi, computeVimshottariDasha, computeYoginiDasha, computeNavamsa, getCurrentDasha, getCurrentYogini } from './chart-calculations'
import { computeGochara, isChandrashtama } from './gochara'
import { getTodaysPanchang } from './panchang-actions'
import { getRemediation } from './remedies'
import type { AstrologyProfile, DailyReading, NatalChart, ReadingPeriod } from './types'
import type { Lang } from './i18n/hi'

export async function getAstrologyProfile(): Promise<AstrologyProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('astrology_profile').select('*').eq('user_id', user.id).maybeSingle()
  return data
}

export interface BirthDetailsInput {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:MM
  birthPlaceName: string
  birthLat: number
  birthLng: number
  birthTimezone: number // UTC offset in hours, e.g. 5.5 for IST
}

// Computes the full natal chart once and stores it — birth details never
// change after this except through an explicit re-edit, and the chart is
// never recomputed on a normal read (see astrology.md's acceptance
// criteria: "doesn't silently recompute/drift on every page load").
export async function upsertAstrologyProfile(input: BirthDetailsInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [year, month, day] = input.birthDate.split('-').map(Number)
  const [hour, minute] = input.birthTime.split(':').map(Number)
  const localHour = hour + minute / 60

  const jd = await julianDay(year, month, day, localHour, input.birthTimezone)
  const [rawPositions, ascendantLongitude] = await Promise.all([
    getPlanetPositions(jd),
    getAscendant(jd, input.birthLat, input.birthLng),
  ])

  const lagna = getRashi(ascendantLongitude)
  const planets = buildPlanetPositions(rawPositions, lagna.rashi)
  const moon = planets.find(p => p.planet === 'Moon')!
  const vimshottariDasha = computeVimshottariDasha(moon.siderealLongitude, input.birthDate)
  const yoginiDasha = computeYoginiDasha(moon.siderealLongitude, input.birthDate)
  const navamsa = computeNavamsa(planets, lagna)

  const natalChart: NatalChart = {
    lagna,
    planets,
    vimshottariDasha,
    yoginiDasha,
    navamsa,
    computedAt: new Date().toISOString(),
  }

  const { error } = await supabase.from('astrology_profile').upsert(
    {
      user_id: user.id,
      birth_date: input.birthDate,
      birth_time: input.birthTime,
      birth_place_name: input.birthPlaceName,
      birth_lat: input.birthLat,
      birth_lng: input.birthLng,
      birth_timezone: input.birthTimezone,
      natal_chart: natalChart,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath('/astrology')
}

// Current transit positions relative to the stored natal chart, narrated by
// AI — the AI only ever receives already-computed positions/dasha state,
// never raw birth data or the ephemeris calculation itself (astrology.md's
// acceptance criteria). `period` only changes how the reading is framed
// (today / this month / this year) — the underlying transit snapshot is the
// same "current planetary positions" calculation either way; monthly/yearly
// readings don't compute a forward window of movement, they interpret the
// present sky through a wider lens, same as how a monthly financial digest
// still runs off today's numbers.
const PERIOD_FRAMING: Record<ReadingPeriod, string> = {
  daily: "Write today's horoscope reading — what today specifically brings.",
  monthly: "Write this month's horoscope outlook — the broader theme the current planetary environment and dasha period suggest for the weeks ahead, not a single day's events.",
  yearly: "Write this year's horoscope outlook — the broader theme the current dasha period suggests for the months ahead, not a single day's events.",
}

const LANGUAGE_INSTRUCTION: Record<Lang, string> = {
  en: '',
  hi: ' Respond entirely in Hindi (Devanagari script), using standard Hindi Vedic-astrology terminology (ग्रह, राशि, भाव, दशा etc.) — write natively in Hindi, not a translated English sentence.',
}

// Reading cache strategy (astrology.md 3.9): each period caches until its
// own calendar boundary rather than a flat duration — a repeat "today's
// reading" request (web reload, or the Telegram bot's/cron's own call the
// same morning) costs zero extra AI spend all day; monthly/yearly the same
// at their own scale. This is the one AI Gateway task in the app where the
// correct TTL genuinely varies per call, so it's computed here and passed
// via askAI's cacheTTLSeconds override rather than a fixed TASK_CONFIG
// constant. A 60s floor avoids a near-zero TTL right at the boundary edge.
function secondsUntilNextISTMidnight(): number {
  return Math.max(60, Math.round((new Date(istMidnightUtc(-1)).getTime() - Date.now()) / 1000))
}
function secondsUntilNextISTMonthBoundary(): number {
  const [y, m] = todayIST().split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return Math.max(60, Math.round((new Date(istDateStrToUtcMidnight(nextMonth)).getTime() - Date.now()) / 1000))
}
function secondsUntilNextISTYearBoundary(): number {
  const y = Number(todayIST().split('-')[0])
  return Math.max(60, Math.round((new Date(istDateStrToUtcMidnight(`${y + 1}-01-01`)).getTime() - Date.now()) / 1000))
}
function ttlForPeriod(period: ReadingPeriod): number {
  return period === 'daily' ? secondsUntilNextISTMidnight()
    : period === 'monthly' ? secondsUntilNextISTMonthBoundary()
    : secondsUntilNextISTYearBoundary()
}

// Shared transit/gochara/dasha context both getAstrologyReading (monthly/
// yearly prose) and getStructuredDailyReading (daily JSON) build their
// prompt from — factored out so the two don't duplicate the ephemeris/
// gochara work or drift out of sync with each other.
async function buildReadingContext(profile: AstrologyProfile) {
  const jdNow = await julianDayNow()
  const [transitPositions, transitAscendant] = await Promise.all([
    getPlanetPositions(jdNow),
    getAscendant(jdNow, profile.birth_lat, profile.birth_lng),
  ])
  const transitLagna = getRashi(transitAscendant)
  const transitPlanets = buildPlanetPositions(transitPositions, transitLagna.rashi)
  const gochara = computeGochara(transitPositions, profile.natal_chart)

  const today = todayIST()
  const currentDasha = getCurrentDasha(profile.natal_chart.vimshottariDasha, today)
  const currentYogini = getCurrentYogini(profile.natal_chart.yoginiDasha, today)

  const natalSummary = profile.natal_chart.planets
    .map(p => `${p.planet} in ${p.rashi} (house ${p.house}, ${p.nakshatra} nakshatra)`)
    .join('; ')
  const navamsaSummary = profile.natal_chart.navamsa
    ? `Navamsa Lagna: ${profile.natal_chart.navamsa.lagna}. Navamsa placements: ${profile.natal_chart.navamsa.planets.map(p => `${p.planet} in ${p.rashi}`).join('; ')}.`
    : ''
  const transitSummary = transitPlanets
    .map(p => `${p.planet} transiting ${p.rashi}${p.retrograde ? ' (retrograde)' : ''}`)
    .join('; ')
  const gocharaSummary = gochara
    .map(g => `${g.planet} is in the ${g.houseFromLagna}th house from Lagna and ${g.houseFromMoon}th from Moon`)
    .join('; ')
  const dashaSummary = currentDasha
    ? `${currentDasha.mahadasha.lord} Mahadasha / ${currentDasha.antardasha.lord} Antardasha, until ${currentDasha.antardasha.endDate}`
    : 'not available'
  const yoginiSummary = currentYogini ? `${currentYogini.lord} Yogini period, until ${currentYogini.endDate}` : 'not available'

  const context = `Natal chart (Rashi/D1) — Lagna: ${profile.natal_chart.lagna.rashi}. Planets: ${natalSummary}.
${navamsaSummary}
Current Vimshottari Dasha: ${dashaSummary}. Current Yogini period: ${yoginiSummary}.
Current transits: ${transitSummary}.
Gochara (transit houses from Lagna/Moon): ${gocharaSummary}.`

  return { context, gochara }
}

export async function getAstrologyReading(profile: AstrologyProfile, period: ReadingPeriod, lang: Lang = 'en'): Promise<string> {
  // Daily period's underlying data is the structured JSON call (astrology.md
  // 3.9) — flattened to readable prose here so existing prose consumers
  // (this function's own callers: the Telegram bot, the astrology-daily
  // cron) keep working unchanged. Both this path and getStructuredDailyReading
  // hit the same askAI('astrology_reading', ...) prompt/cache key for a given
  // day+language, so calling both the same day only costs one real AI call.
  if (period === 'daily') {
    const daily = await getStructuredDailyReading(profile, lang)
    // These connector labels are only ever seen by this function's non-web
    // callers (Telegram bot, astrology-daily cron) — the web page renders
    // favorableFor/avoid/moodForecast as separate structured sections via
    // getStructuredDailyReading directly, never through this flattened
    // string, so `lang` has to drive the labels here too, not just the
    // AI-generated content.
    const LABELS = lang === 'hi'
      ? { favorableFor: 'अनुकूल', avoid: 'बचें', mood: 'मनोदशा' }
      : { favorableFor: 'Favorable for', avoid: 'Avoid', mood: 'Mood' }
    const lines = [daily.summary]
    if (daily.favorableFor.length) lines.push(`${LABELS.favorableFor}: ${daily.favorableFor.join('; ')}.`)
    if (daily.avoid.length) lines.push(`${LABELS.avoid}: ${daily.avoid.join('; ')}.`)
    if (daily.moodForecast) lines.push(`${LABELS.mood}: ${daily.moodForecast}`)
    return lines.join('\n\n')
  }

  const { context } = await buildReadingContext(profile)
  const prompt = `${context}\n\n${PERIOD_FRAMING[period]}`

  return askAI(
    'astrology_reading',
    prompt,
    `You are a traditional Vedic astrology reader. Given a natal chart summary (including Navamsa/D9), the current Vimshottari and Yogini dasha periods, current planetary transits, and gochara house placements, write a short, specific horoscope reading — 3-4 sentences, plain language, grounded in the actual positions given (name the relevant planets/houses), not generic. Frame it as traditional guidance, not certainty. Plain text only, no markdown formatting. Under 120 words.${LANGUAGE_INSTRUCTION[lang]}`,
    { cacheTTLSeconds: ttlForPeriod(period) }
  )
}

function emptyDailyReading(chart: NatalChart, lang: Lang, chandrashtama = false): DailyReading {
  return {
    summary: 'Reading unavailable right now.',
    favorableFor: [],
    avoid: [],
    remediation: getRemediation(chart, 3, lang).map(r => r.text),
    moodForecast: '',
    isChandrashtama: chandrashtama,
  }
}

// Daily reading's structured output (astrology.md 3.9) — summary/
// favorableFor/avoid/moodForecast come from the model, grounded only in the
// computed context below; `remediation` is filled in afterward from the
// same curated getRemediation() table the standalone Remediation card uses,
// never asked of the model, keeping the "never left to the model to invent"
// rule intact even inside this structured response.
export async function getStructuredDailyReading(profile: AstrologyProfile, lang: Lang = 'en'): Promise<DailyReading> {
  const { context, gochara } = await buildReadingContext(profile)
  const transitingMoon = gochara.find(g => g.planet === 'Moon')
  const chandrashtama = isChandrashtama(gochara)
  const panchang = await getTodaysPanchang(profile.birth_lat, profile.birth_lng, profile.birth_timezone)

  const moodContext = transitingMoon
    ? `Transiting Moon is in the ${transitingMoon.houseFromMoon}th house from your natal Moon${chandrashtama ? ' — this is Chandrashtama, a traditionally more cautious/lower-energy day' : ''}.`
    : ''
  const tithiContext = panchang ? `Today's tithi: ${panchang.tithi} (${panchang.paksha} Paksha).` : ''

  const prompt = `${context}\n${moodContext}\n${tithiContext}\n\n${PERIOD_FRAMING.daily}`

  const raw = await askAI(
    'astrology_reading',
    prompt,
    `You are a traditional Vedic astrology reader. Given a natal chart summary (including Navamsa/D9), the current Vimshottari and Yogini dasha periods, current planetary transits, gochara house placements, the transiting Moon's relation to the natal Moon, and today's tithi, return ONLY a JSON object in this exact shape: {"summary": string, "favorableFor": string[], "avoid": string[], "moodForecast": string}. "summary" is 2-3 sentences grounded in the actual positions given, plain language, not generic. "favorableFor" is 2-4 short actionable phrases (e.g. "good day for financial decisions") grounded in the dasha+gochara+panchang context. "avoid" is 1-3 short actionable phrases (e.g. "avoid signing new agreements") grounded in the same context. "moodForecast" is 1-2 sentences on how mood/emotional tone may run today, grounded specifically in the transiting Moon's position relative to the natal Moon (mention Chandrashtama if flagged) — frame as traditional astrological interpretation, constructive and even-handed, never a clinical or diagnostic claim about actual emotional state. Frame everything as traditional guidance, not certainty. No markdown. Return ONLY the JSON object, nothing else.${LANGUAGE_INSTRUCTION[lang]}`,
    { cacheTTLSeconds: ttlForPeriod('daily') }
  )

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return emptyDailyReading(profile.natal_chart, lang, chandrashtama)
    const parsed = JSON.parse(match[0]) as Partial<DailyReading>
    if (!parsed.summary) return emptyDailyReading(profile.natal_chart, lang, chandrashtama)
    return {
      summary: parsed.summary,
      favorableFor: Array.isArray(parsed.favorableFor) ? parsed.favorableFor : [],
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid : [],
      remediation: getRemediation(profile.natal_chart, 3, lang).map(r => r.text),
      moodForecast: parsed.moodForecast ?? '',
      isChandrashtama: chandrashtama,
    }
  } catch {
    return emptyDailyReading(profile.natal_chart, lang, chandrashtama)
  }
}

// Characteristics/personality profile (astrology.md 3.8) — a stable read
// off the natal chart alone (Lagna, planetary placements, Navamsa), not a
// forecast, so it doesn't take a period. Caches effectively indefinitely
// (TASK_CONFIG's astrology_characteristics entry, ONE_YEAR) since the
// prompt — and therefore the cache key — only changes when the chart itself
// changes (birth details re-saved), no dynamic TTL needed here unlike
// getAstrologyReading above.
export async function getAstrologyCharacteristics(profile: AstrologyProfile, lang: Lang = 'en'): Promise<string> {
  const chart = profile.natal_chart
  const natalSummary = chart.planets
    .map(p => `${p.planet} in ${p.rashi} (house ${p.house}, ${p.nakshatra} nakshatra${p.retrograde ? ', retrograde' : ''})`)
    .join('; ')
  const navamsaSummary = chart.navamsa
    ? `Navamsa Lagna: ${chart.navamsa.lagna}. Navamsa placements: ${chart.navamsa.planets.map(p => `${p.planet} in ${p.rashi}`).join('; ')}.`
    : ''

  const context = `Natal chart (Rashi/D1) — Lagna: ${chart.lagna.rashi}. Planets: ${natalSummary}.\n${navamsaSummary}`

  return askAI(
    'astrology_characteristics',
    context,
    `You are a traditional Vedic astrology reader. Given a natal chart summary (Lagna, planetary placements with houses/nakshatras, and Navamsa/D9), write a grounded characteristics/personality profile: Lagna qualities, Moon sign (mind/emotional nature), notable strong and weak planetary placements, and general tendencies. 4-6 sentences, plain language, grounded only in the actual chart data given — never invent a placement not in the data. Frame as traditional astrological interpretation, not a definitive personal judgment. Plain text only, no markdown. Under 180 words.${LANGUAGE_INSTRUCTION[lang]}`
  )
}
