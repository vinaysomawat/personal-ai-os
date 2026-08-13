// The classical Navagraha — Vedic astrology uses the Sun/Moon/5 visible
// planets plus the lunar nodes (Rahu/Ketu), not the outer planets
// (Uranus/Neptune/Pluto) Western astrology adds; Vimshottari Dasha is built
// entirely around these 9.
export type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu'

export type Rashi =
  | 'Mesha' | 'Vrishabha' | 'Mithuna' | 'Karka' | 'Simha' | 'Kanya'
  | 'Tula' | 'Vrishchika' | 'Dhanu' | 'Makara' | 'Kumbha' | 'Meena'

export type Nakshatra =
  | 'Ashwini' | 'Bharani' | 'Krittika' | 'Rohini' | 'Mrigashira' | 'Ardra'
  | 'Punarvasu' | 'Pushya' | 'Ashlesha' | 'Magha' | 'Purva Phalguni' | 'Uttara Phalguni'
  | 'Hasta' | 'Chitra' | 'Swati' | 'Vishakha' | 'Anuradha' | 'Jyeshtha'
  | 'Mula' | 'Purva Ashadha' | 'Uttara Ashadha' | 'Shravana' | 'Dhanishta' | 'Shatabhisha'
  | 'Purva Bhadrapada' | 'Uttara Bhadrapada' | 'Revati'

export interface PlanetPosition {
  planet: Planet
  siderealLongitude: number // 0-360, Lahiri-corrected
  rashi: Rashi
  rashiDegree: number // 0-30, degree within the rashi
  nakshatra: Nakshatra
  nakshatraPada: 1 | 2 | 3 | 4
  house: number // 1-12, whole-sign from Lagna
  retrograde: boolean
}

export interface DashaPeriod {
  lord: Planet
  startDate: string // ISO date (YYYY-MM-DD)
  endDate: string
  level: 'mahadasha' | 'antardasha'
  parentLord?: Planet // set on antardasha rows — which mahadasha it nests under
}

// The secondary, shorter (36-year) dasha system — single-level only, no
// antardasha subdivision (Yogini Dasha is traditionally used unsubdivided,
// unlike Vimshottari).
export type Yogini = 'Mangala' | 'Pingala' | 'Dhanya' | 'Bhramari' | 'Bhadrika' | 'Ulka' | 'Siddha' | 'Sankata'

export interface YoginiPeriod {
  lord: Yogini
  startDate: string
  endDate: string
}

export interface RemedyItem {
  title: string
  text: string
}

// Navamsa (D9) — a second chart derived mathematically from the D1
// (Rashi) chart via a fixed divisional formula, not a new ephemeris
// calculation. No pada/nakshatra/retrograde fields — D9 only concerns
// itself with which rashi each planet (and the D9 lagna) falls into.
export interface NavamsaPosition {
  planet: Planet
  rashi: Rashi
  house: number // whole-sign house from the D9 lagna
}

export interface NavamsaChart {
  lagna: Rashi
  planets: NavamsaPosition[]
}

export interface NatalChart {
  lagna: { rashi: Rashi; degree: number }
  planets: PlanetPosition[]
  vimshottariDasha: DashaPeriod[]
  yoginiDasha: YoginiPeriod[]
  navamsa: NavamsaChart
  computedAt: string // ISO datetime — chart is computed once at profile save, never recomputed
}

// Current transit positions relative to the natal chart — always computed
// fresh for "now," never stored (unlike D1/D9/dashas, which are fixed at
// birth). House-from-Lagna matches the whole-sign convention used
// everywhere else in this module; house-from-Moon is the traditional
// second reference point gochara analysis also uses.
export interface GocharaPosition {
  planet: Planet
  rashi: Rashi
  houseFromLagna: number
  houseFromMoon: number
  retrograde: boolean
}

export interface AstrologyProfile {
  id: string
  user_id: string
  birth_date: string // YYYY-MM-DD
  birth_time: string // HH:MM, 24h, local to birth_timezone
  birth_place_name: string
  birth_lat: number
  birth_lng: number
  birth_timezone: number // UTC offset in hours, e.g. 5.5 for IST
  natal_chart: NatalChart
  created_at: string
  updated_at: string
}

export interface CurrentDasha {
  mahadasha: DashaPeriod
  antardasha: DashaPeriod
}

export type ReadingPeriod = 'daily' | 'monthly' | 'yearly'

export type Paksha = 'Shukla' | 'Krishna'

// Global, no user_id — one row per calendar date, computed once and reused
// (same pattern as coding_questions/workout_library), not birth-dependent.
// Sunrise/sunset/kalam windows are location-dependent; this app defaults to
// the profile's birth-place coordinates as the reference location.
export interface PanchangDaily {
  date: string
  tithi: string
  paksha: Paksha
  nakshatra: Nakshatra
  yoga: string
  karana: string
  sunrise: string // HH:MM local
  sunset: string
  rahu_kalam_start: string
  rahu_kalam_end: string
  yamaganda_start: string
  yamaganda_end: string
  gulika_kalam_start: string
  gulika_kalam_end: string
}
