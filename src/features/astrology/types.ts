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

export interface NatalChart {
  lagna: { rashi: Rashi; degree: number }
  planets: PlanetPosition[]
  vimshottariDasha: DashaPeriod[]
  yoginiDasha: YoginiPeriod[]
  computedAt: string // ISO datetime — chart is computed once at profile save, never recomputed
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
