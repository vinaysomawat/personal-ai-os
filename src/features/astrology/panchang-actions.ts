'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { todayIST } from '@/lib/date'
import { getSunMoonLongitudes, getSunriseSunset, jdToLocalHHMM, julianDayLocalMidnightUt } from './ephemeris'
import { getTithi, getYoga, getKarana, getNakshatraOfDay, getMuhurtaWindows } from './panchang'
import type { PanchangDaily } from './types'

// Panchang is global (no user_id) and location-dependent (sunrise/sunset/
// kalam windows shift by location) — defaults to the given lat/lng/UTC
// offset (the profile's birth place) since there's no separate "current
// location" setting. Uses the service client since this table has no
// owner-scoped RLS to satisfy (same reasoning as coding_questions/
// workout_library).
export async function getTodaysPanchang(lat: number, lng: number, utcOffsetHours: number): Promise<PanchangDaily | null> {
  const supabase = createServiceClient()
  const today = todayIST()

  const { data: existing } = await supabase.from('panchang_daily').select('*').eq('date', today).maybeSingle()
  if (existing) return existing

  const computed = await computePanchang(today, lat, lng, utcOffsetHours)
  if (!computed) return null

  const { data, error } = await supabase.from('panchang_daily').upsert(computed, { onConflict: 'date' }).select().single()
  if (error) throw new Error(error.message)
  return data
}

async function computePanchang(dateIso: string, lat: number, lng: number, utcOffsetHours: number): Promise<PanchangDaily | null> {
  const [year, month, day] = dateIso.split('-').map(Number)
  const jdLocalMidnight = await julianDayLocalMidnightUt(year, month, day, utcOffsetHours)

  const sunriseSunset = await getSunriseSunset(jdLocalMidnight, lat, lng)
  if (!sunriseSunset) return null // polar day/night edge case — no sunrise/sunset that day

  // Panchang values (tithi/yoga/karana/nakshatra-of-day) are conventionally
  // taken at sunrise, not local midnight — matches how printed panchangs work.
  const { sun, moon } = await getSunMoonLongitudes(sunriseSunset.sunriseJd)
  const tithi = getTithi(sun, moon)
  const yoga = getYoga(sun, moon)
  const karana = getKarana(sun, moon)
  const nakshatra = getNakshatraOfDay(moon)

  const sunrise = await jdToLocalHHMM(sunriseSunset.sunriseJd, utcOffsetHours)
  const sunset = await jdToLocalHHMM(sunriseSunset.sunsetJd, utcOffsetHours)
  const sunriseMinutes = hhmmToMinutes(sunrise)
  const sunsetMinutes = hhmmToMinutes(sunset)
  const weekday = new Date(`${dateIso}T00:00:00Z`).getUTCDay() // dateIso is already the local calendar date
  const { rahuKalam, yamaganda, gulikaKalam } = getMuhurtaWindows(weekday, sunriseMinutes, sunsetMinutes)

  return {
    date: dateIso,
    tithi: tithi.name,
    paksha: tithi.paksha,
    nakshatra,
    yoga,
    karana,
    sunrise,
    sunset,
    rahu_kalam_start: rahuKalam.start,
    rahu_kalam_end: rahuKalam.end,
    yamaganda_start: yamaganda.start,
    yamaganda_end: yamaganda.end,
    gulika_kalam_start: gulikaKalam.start,
    gulika_kalam_end: gulikaKalam.end,
  }
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
