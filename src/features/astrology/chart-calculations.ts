import type { CurrentDasha, DashaPeriod, Nakshatra, NavamsaChart, Planet, PlanetPosition, Rashi, Yogini, YoginiPeriod } from './types'
import type { RawPosition } from './ephemeris'

const RASHIS: Rashi[] = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
]

const NAKSHATRAS: Nakshatra[] = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

const NAKSHATRA_SPAN = 360 / 27 // 13°20'

export function getRashi(siderealLongitude: number): { rashi: Rashi; degree: number } {
  const index = Math.floor(siderealLongitude / 30)
  return { rashi: RASHIS[index], degree: siderealLongitude % 30 }
}

export function getNakshatra(siderealLongitude: number): { nakshatra: Nakshatra; pada: 1 | 2 | 3 | 4 } {
  const nakIndex = Math.floor(siderealLongitude / NAKSHATRA_SPAN)
  const positionInNakshatra = siderealLongitude - nakIndex * NAKSHATRA_SPAN
  const pada = (Math.floor(positionInNakshatra / (NAKSHATRA_SPAN / 4)) + 1) as 1 | 2 | 3 | 4
  return { nakshatra: NAKSHATRAS[nakIndex], pada }
}

// Whole-sign houses — the simplest and most widely used Vedic house system:
// the Lagna's rashi is always house 1, and every other rashi is numbered
// sequentially around the zodiac from there, regardless of exact degree.
export function getHouse(planetRashi: Rashi, lagnaRashi: Rashi): number {
  const lagnaIndex = RASHIS.indexOf(lagnaRashi)
  const planetIndex = RASHIS.indexOf(planetRashi)
  return ((planetIndex - lagnaIndex + 12) % 12) + 1
}

export function buildPlanetPositions(raw: RawPosition[], lagnaRashi: Rashi): PlanetPosition[] {
  return raw.map(r => {
    const { rashi, degree } = getRashi(r.siderealLongitude)
    const { nakshatra, pada } = getNakshatra(r.siderealLongitude)
    return {
      planet: r.planet,
      siderealLongitude: r.siderealLongitude,
      rashi,
      rashiDegree: degree,
      nakshatra,
      nakshatraPada: pada,
      house: getHouse(rashi, lagnaRashi),
      retrograde: r.retrograde,
    }
  })
}

// Vimshottari Dasha — a fixed 120-year cycle across the 9 grahas, the
// default/primary dasha system for general prediction. The starting
// Mahadasha lord is whichever graha rules the Moon's birth nakshatra; each
// nakshatra's ruling lord cycles through this same 9-planet order, 3 full
// cycles per 27 nakshatras. Order and year-lengths are fixed by tradition
// and never vary.
const DASHA_ORDER: Planet[] = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
const DASHA_YEARS: Record<Planet, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
}
const DAYS_PER_YEAR = 365.25

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + Math.round(days))
  return d.toISOString().slice(0, 10)
}

// `moonSiderealLongitude` and `birthDateIso` (YYYY-MM-DD) come from the
// already-computed natal chart — this function does no ephemeris lookups of
// its own, matching Health's calculations.ts pattern of pure functions over
// already-fetched data.
export function computeVimshottariDasha(moonSiderealLongitude: number, birthDateIso: string): DashaPeriod[] {
  const nakIndex = Math.floor(moonSiderealLongitude / NAKSHATRA_SPAN)
  const positionInNakshatra = moonSiderealLongitude - nakIndex * NAKSHATRA_SPAN
  const fractionElapsed = positionInNakshatra / NAKSHATRA_SPAN

  const startLordIndex = nakIndex % 9
  const periods: DashaPeriod[] = []

  // First Mahadasha is already partway elapsed at birth — only its
  // remaining balance is shown going forward from the birth date.
  let cursor = birthDateIso
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(startLordIndex + i) % 9]
    const fullYears = DASHA_YEARS[lord]
    const yearsForThisPeriod = i === 0 ? fullYears * (1 - fractionElapsed) : fullYears
    const end = addDays(cursor, yearsForThisPeriod * DAYS_PER_YEAR)

    periods.push({ lord, startDate: cursor, endDate: end, level: 'mahadasha' })
    periods.push(...computeAntardashas(lord, cursor, end))
    cursor = end
  }

  return periods
}

// Each Mahadasha subdivides into 9 Antardashas, one per graha in the same
// fixed cyclic order but starting from the Mahadasha's own lord, each
// proportional to (mahadashaYears × antardashaLordYears) / 120.
function computeAntardashas(mahaLord: Planet, mahaStart: string, mahaEnd: string): DashaPeriod[] {
  const mahaDays = (new Date(`${mahaEnd}T00:00:00Z`).getTime() - new Date(`${mahaStart}T00:00:00Z`).getTime()) / 86400000
  const startIndex = DASHA_ORDER.indexOf(mahaLord)

  const periods: DashaPeriod[] = []
  let cursor = mahaStart
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(startIndex + i) % 9]
    const days = (mahaDays * DASHA_YEARS[lord]) / 120
    const end = i === 8 ? mahaEnd : addDays(cursor, days) // last antardasha absorbs any rounding drift
    periods.push({ lord, startDate: cursor, endDate: end, level: 'antardasha', parentLord: mahaLord })
    cursor = end
  }
  return periods
}

// Yogini Dasha — a secondary, shorter (36-year) dasha system, shown
// alongside Vimshottari as supplementary context, not a replacement (per
// astrology.md's acceptance criteria). Also keyed off the Moon's birth
// nakshatra, but with its own fixed 8-lord order/year-lengths and its own
// starting-point rule. Single-level only — no antardasha subdivision;
// Yogini is traditionally consulted at the Mahadasha-equivalent level alone.
//
// Starting lord: ((nakshatraNumber + 3) mod 8), 0 mapped to 8 — the classical
// Devi Bhagavata formula (count nakshatra number from Ashwini=1, add 3,
// divide by 8, remainder gives the Yogini). Verified 2026-08-18 against the
// full published 27-nakshatra → starting-Yogini table (e.g. Ashwini/
// Ashlesha/Anuradha/Purvabhadrapada → Bhramari; Rohini/Uttara Phalguni/
// Purva Ashadha → Siddha) and cross-checked against an independent worked
// example (Anuradha, nakshatra 17 → (17+3) mod 8 = 4 → Bhramari) — all 27
// nakshatras match. This formula previously had an erroneous extra "× 2"
// (`(nakshatraNumber × 2 + 3) mod 8`), which produced the wrong starting
// lord for every chart (e.g. Rohini incorrectly started Dhanya instead of
// the correct Siddha) — fixed as part of this verification, not just
// flagged.
const YOGINI_ORDER: Yogini[] = ['Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata']
const YOGINI_YEARS: Record<Yogini, number> = {
  Mangala: 1, Pingala: 2, Dhanya: 3, Bhramari: 4, Bhadrika: 5, Ulka: 6, Siddha: 7, Sankata: 8,
}

export function computeYoginiDasha(moonSiderealLongitude: number, birthDateIso: string, cyclesToCompute = 3): YoginiPeriod[] {
  const nakIndex = Math.floor(moonSiderealLongitude / NAKSHATRA_SPAN) // 0-26
  const nakshatraNumber = nakIndex + 1 // 1-27
  const positionInNakshatra = moonSiderealLongitude - nakIndex * NAKSHATRA_SPAN
  const fractionElapsed = positionInNakshatra / NAKSHATRA_SPAN

  const rawStart = (nakshatraNumber + 3) % 8
  const startLordIndex = (rawStart === 0 ? 8 : rawStart) - 1

  const periods: YoginiPeriod[] = []
  let cursor = birthDateIso
  const totalPeriods = 8 * cyclesToCompute
  for (let i = 0; i < totalPeriods; i++) {
    const lord = YOGINI_ORDER[(startLordIndex + i) % 8]
    const fullYears = YOGINI_YEARS[lord]
    const yearsForThisPeriod = i === 0 ? fullYears * (1 - fractionElapsed) : fullYears
    const end = addDays(cursor, yearsForThisPeriod * DAYS_PER_YEAR)
    periods.push({ lord, startDate: cursor, endDate: end })
    cursor = end
  }
  return periods
}

// `timeline` defensively defaults to [] — a chart saved before yoginiDasha
// was added to NatalChart won't have this field until re-saved, and a
// missing secondary dasha line should degrade quietly, not crash the page.
export function getCurrentYogini(timeline: YoginiPeriod[] | undefined, todayIso: string): YoginiPeriod | null {
  return (timeline ?? []).find(p => p.startDate <= todayIso && todayIso < p.endDate) ?? null
}

// Navamsa (D9) — a pure function over already-computed D1 positions, no
// ephemeris calls. Each rashi (30°) splits into 9 navamsas of 3°20' each;
// the D9 sign is (rashiIndex × 9 + navamsaNumber - 1) mod 12. This closed-
// form is the standard computational shortcut for the classical rule
// (movable signs start their navamsa count from themselves, fixed signs
// from the 9th sign, dual signs from the 5th). Verified 2026-08-18: proved
// algebraically equivalent to the verbose classical branching rule for all
// 12 rashis (rashiIndex mod 3 selects movable/fixed/dual, giving a start
// offset of 0/8/4 — since gcd(9,12)=3, rashiIndex×9 mod 12 collapses to
// exactly that same offset pattern for every rashi, not just two examples),
// then spot-checked against a real natal chart's Lagna + all 9 planets — all
// 10 positions matched the verbose rule's output exactly.
const NAVAMSA_SPAN = 30 / 9 // 3°20'

function navamsaRashi(rashi: Rashi, rashiDegree: number): Rashi {
  const rashiIndex = RASHIS.indexOf(rashi)
  const navamsaNumber = Math.floor(rashiDegree / NAVAMSA_SPAN) + 1 // 1-9
  const d9Index = (rashiIndex * 9 + navamsaNumber - 1) % 12
  return RASHIS[d9Index]
}

export function computeNavamsa(planets: PlanetPosition[], lagna: { rashi: Rashi; degree: number }): NavamsaChart {
  const d9Lagna = navamsaRashi(lagna.rashi, lagna.degree)
  const d9Planets = planets.map(p => {
    const rashi = navamsaRashi(p.rashi, p.rashiDegree)
    return { planet: p.planet, rashi, house: getHouse(rashi, d9Lagna) }
  })
  return { lagna: d9Lagna, planets: d9Planets }
}

// The currently-active Mahadasha + nested Antardasha, from the already-
// computed (and stored) timeline — no recomputation, just a lookup against
// today's date. Returns null only if `today` falls outside the stored
// timeline entirely (shouldn't happen within a human lifespan; the 120-year
// cycle comfortably covers it).
export function getCurrentDasha(timeline: DashaPeriod[], todayIso: string): CurrentDasha | null {
  const mahadasha = timeline.find(p => p.level === 'mahadasha' && p.startDate <= todayIso && todayIso < p.endDate)
  if (!mahadasha) return null
  const antardasha = timeline.find(p => p.level === 'antardasha' && p.parentLord === mahadasha.lord
    && p.startDate <= todayIso && todayIso < p.endDate)
  if (!antardasha) return null
  return { mahadasha, antardasha }
}
