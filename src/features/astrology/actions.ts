'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { todayIST } from '@/lib/date'
import { getPlanetPositions, getAscendant, julianDay, julianDayNow } from './ephemeris'
import { buildPlanetPositions, getRashi, computeVimshottariDasha, computeYoginiDasha, getCurrentDasha } from './chart-calculations'
import type { AstrologyProfile, NatalChart, ReadingPeriod } from './types'

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

  const natalChart: NatalChart = {
    lagna,
    planets,
    vimshottariDasha,
    yoginiDasha,
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
// still runs off today's numbers. Cache is a flat SIX_HOURS TTL in the
// gateway, but since the prompt embeds the current transit longitudes plus
// the period, a new day's different transit data naturally produces a
// different prompt hash and busts the cache on its own — no separate
// "cache until end of period" mechanism needed.
const PERIOD_FRAMING: Record<ReadingPeriod, string> = {
  daily: "Write today's horoscope reading — what today specifically brings.",
  monthly: "Write this month's horoscope outlook — the broader theme the current planetary environment and dasha period suggest for the weeks ahead, not a single day's events.",
  yearly: "Write this year's horoscope outlook — the broader theme the current dasha period suggests for the months ahead, not a single day's events.",
}

export async function getAstrologyReading(profile: AstrologyProfile, period: ReadingPeriod): Promise<string> {
  const jdNow = await julianDayNow()
  const [transitPositions, transitAscendant] = await Promise.all([
    getPlanetPositions(jdNow),
    getAscendant(jdNow, profile.birth_lat, profile.birth_lng),
  ])
  const transitLagna = getRashi(transitAscendant)
  const transitPlanets = buildPlanetPositions(transitPositions, transitLagna.rashi)

  const currentDasha = getCurrentDasha(profile.natal_chart.vimshottariDasha, todayIST())

  const natalSummary = profile.natal_chart.planets
    .map(p => `${p.planet} in ${p.rashi} (house ${p.house}, ${p.nakshatra} nakshatra)`)
    .join('; ')
  const transitSummary = transitPlanets
    .map(p => `${p.planet} transiting ${p.rashi}${p.retrograde ? ' (retrograde)' : ''}`)
    .join('; ')
  const dashaSummary = currentDasha
    ? `${currentDasha.mahadasha.lord} Mahadasha / ${currentDasha.antardasha.lord} Antardasha, until ${currentDasha.antardasha.endDate}`
    : 'not available'

  const context = `Natal chart — Lagna: ${profile.natal_chart.lagna.rashi}. Planets: ${natalSummary}.
Current Vimshottari Dasha: ${dashaSummary}.
Current transits: ${transitSummary}.

${PERIOD_FRAMING[period]}`

  return askAI(
    'astrology_reading',
    context,
    'You are a traditional Vedic astrology reader. Given a natal chart summary, the current Vimshottari Dasha period, and current planetary transits, write a short, specific horoscope reading — 3-4 sentences, plain language, grounded in the actual positions given (name the relevant planets/houses), not generic. Frame it as traditional guidance, not certainty. Plain text only, no markdown formatting. Under 120 words.'
  )
}
