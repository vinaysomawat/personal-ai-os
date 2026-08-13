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

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}
