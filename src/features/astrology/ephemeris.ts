import type { Planet } from './types'

// swisseph-wasm ships as an ESM module with an async WASM init step; this
// wrapper is the only file in the module that touches it directly, so a
// wrong ayanamsa/flag combination can only be introduced here — every other
// file works with plain sidereal-longitude numbers. Validated at spike time:
// the Lahiri ayanamsa this produces at J2000.0 (2000-01-01 12:00 UT) came out
// to 23.8571°, matching the widely-published reference value of ~23.85°.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let swePromise: Promise<any> | null = null

async function getSwe() {
  if (!swePromise) {
    swePromise = (async () => {
      const { default: SwissEph } = await import('swisseph-wasm')
      const swe = new SwissEph()
      await swe.initSwissEph()
      swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0)
      return swe
    })()
  }
  return swePromise
}

const GRAHA_IDS: Record<Exclude<Planet, 'Rahu' | 'Ketu'>, number> = {
  Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4, Jupiter: 5, Saturn: 6,
}

export interface RawPosition {
  planet: Planet
  siderealLongitude: number // 0-360
  retrograde: boolean
}

// Every graha's sidereal (Lahiri) longitude for a given UTC instant.
// Rahu is the mean lunar node; Ketu is always exactly opposite Rahu, not a
// body the ephemeris tracks separately — standard Vedic convention.
export async function getPlanetPositions(jd: number): Promise<RawPosition[]> {
  const swe = await getSwe()
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL | swe.SEFLG_SPEED

  const positions: RawPosition[] = (Object.keys(GRAHA_IDS) as (keyof typeof GRAHA_IDS)[]).map(name => {
    const result = swe.calc_ut(jd, GRAHA_IDS[name], flags)
    return { planet: name, siderealLongitude: normalizeDegrees(result[0]), retrograde: result[3] < 0 }
  })

  const rahu = swe.calc_ut(jd, swe.SE_MEAN_NODE, flags)
  const rahuLon = normalizeDegrees(rahu[0])
  positions.push({ planet: 'Rahu', siderealLongitude: rahuLon, retrograde: true }) // nodes are always retrograde in mean motion
  positions.push({ planet: 'Ketu', siderealLongitude: normalizeDegrees(rahuLon + 180), retrograde: true })

  return positions
}

// Sidereal Ascendant (Lagna) longitude for a birth instant + location.
export async function getAscendant(jd: number, lat: number, lng: number): Promise<number> {
  const swe = await getSwe()
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL
  const result = swe.houses_ex(jd, flags, lat, lng, 'W') // 'W' = whole-sign, though only ascmc[0] is used
  return normalizeDegrees(result.ascmc[0])
}

// Julian Day for a birth instant given in local time + UTC offset (hours).
export async function julianDay(year: number, month: number, day: number, localHour: number, utcOffsetHours: number): Promise<number> {
  const swe = await getSwe()
  return swe.julday(year, month, day, localHour - utcOffsetHours)
}

// Julian Day for "now", used for transit calculations.
export async function julianDayNow(): Promise<number> {
  const swe = await getSwe()
  const now = new Date()
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60
  return swe.julday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), utcHour)
}

// Sun's sidereal longitude only — panchang math (tithi/yoga/karana) needs
// just Sun+Moon, not the full 9-graha sweep getPlanetPositions does.
export async function getSunMoonLongitudes(jd: number): Promise<{ sun: number; moon: number }> {
  const swe = await getSwe()
  const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SIDEREAL
  const sun = swe.calc_ut(jd, swe.SE_SUN, flags)
  const moon = swe.calc_ut(jd, swe.SE_MOON, flags)
  return { sun: normalizeDegrees(sun[0]), moon: normalizeDegrees(moon[0]) }
}

// Sunrise/sunset as Julian Days (UT) for a given search-start instant +
// location. `rise_trans`'s geopos is [lon, lat, alt] — note the reversed
// order vs `getAscendant`'s (lat, lng), which is `houses_ex`'s own
// parameter order.
export async function getSunriseSunset(jdSearchStartUt: number, lat: number, lng: number): Promise<{ sunriseJd: number; sunsetJd: number } | null> {
  const swe = await getSwe()
  const flags = swe.SEFLG_SWIEPH
  const geopos = [lng, lat, 0]
  const rise = swe.rise_trans(jdSearchStartUt, swe.SE_SUN, '', flags, swe.SE_CALC_RISE, geopos, 0, 0)
  const set = swe.rise_trans(jdSearchStartUt, swe.SE_SUN, '', flags, swe.SE_CALC_SET, geopos, 0, 0)
  if (!rise || !set) return null
  return { sunriseJd: rise[0], sunsetJd: set[0] }
}

// Julian Day (UT) -> "HH:MM" in the given local UTC offset. Panchang is a
// local-civil-calendar concept (weekday, sunrise/sunset clock time) — every
// panchang value must be expressed in local time, not UT, or an IST
// sunrise near UTC midnight would show as the wrong day/hour entirely.
export async function jdToLocalHHMM(jd: number, utcOffsetHours: number): Promise<string> {
  const swe = await getSwe()
  const { hour: utHourFrac } = swe.revjul(jd, swe.SE_GREG_CAL)
  const localHourFrac = ((utHourFrac + utcOffsetHours) % 24 + 24) % 24
  const hour = Math.floor(localHourFrac)
  const minute = Math.round((localHourFrac - hour) * 60)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Julian Day (UT) for local midnight of a given local calendar date — the
// reference instant panchang values and sunrise/sunset searches start
// from. Mirrors `julianDay()`'s (localHour - utcOffsetHours) convention.
export async function julianDayLocalMidnightUt(year: number, month: number, day: number, utcOffsetHours: number): Promise<number> {
  const swe = await getSwe()
  return swe.julday(year, month, day, 0 - utcOffsetHours)
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}
