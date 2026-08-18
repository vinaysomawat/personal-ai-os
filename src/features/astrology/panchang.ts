import type { ChoghadiyaBlock, Nakshatra } from './types'
import { getNakshatra } from './chart-calculations'

// Deterministic Hindu daily calendar — tithi/yoga/karana all derive from
// the Sun-Moon angular relationship, which is ayanamsa-independent (it's a
// difference of two sidereal longitudes, so the ayanamsa offset cancels
// out identically whether tropical or sidereal longitudes are used).
// Global/calendar-wide — no birth data, no user_id, same "compute once,
// reuse everywhere" pattern as coding_questions/workout_library.
//
// Verified 2026-08-18: tithi/nakshatra/yoga/karana/sunrise for 2026-01-14,
// New Delhi (28.6139°N, 77.209°E), computed via this same Sun/Moon-longitude
// pipeline at the sunrise instant, matched Drik Panchang's published values
// for that exact date/location exactly — Ekadashi (Krishna Paksha),
// Anuradha nakshatra, Ganda yoga, Balava karana, sunrise 07:15. Sunset was
// 1 minute off (17:46 computed vs 17:45 published), within normal
// algorithm/refraction-model variance, not a discrepancy.

export type Paksha = 'Shukla' | 'Krishna'

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
]

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti',
  'Shoola', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata',
  'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
]

const KARANA_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti']
const KARANA_FIXED_END = ['Shakuni', 'Chatushpada', 'Naga']

export interface TithiResult {
  name: string // e.g. "Panchami" or "Purnima" / "Amavasya"
  paksha: Paksha
  number: number // 1-15 within the paksha
}

// Tithi = 12° steps of (Moon - Sun); 30 tithis per lunar month, 15 per paksha.
export function getTithi(sunLongitude: number, moonLongitude: number): TithiResult {
  const angle = normalizeDegrees(moonLongitude - sunLongitude)
  const index = Math.floor(angle / 12) // 0-29
  const paksha: Paksha = index < 15 ? 'Shukla' : 'Krishna'
  const withinPaksha = index % 15 // 0-14
  const number = withinPaksha + 1
  const name = withinPaksha === 14
    ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya')
    : TITHI_NAMES[withinPaksha]
  return { name, paksha, number }
}

// Yoga = 13°20' steps of (Sun + Moon) — same span as a nakshatra, different
// reference (a sum, not either body's own longitude).
export function getYoga(sunLongitude: number, moonLongitude: number): string {
  const sum = normalizeDegrees(sunLongitude + moonLongitude)
  const index = Math.floor(sum / (360 / 27))
  return YOGA_NAMES[index]
}

// Karana = 6° steps of (Moon - Sun), i.e. half-tithis — 60 per lunar month.
// The first (index 0) and last three (57-59) are the four fixed karanas;
// the 56 in between cycle through the 7 movable ones, 8 full cycles.
export function getKarana(sunLongitude: number, moonLongitude: number): string {
  const angle = normalizeDegrees(moonLongitude - sunLongitude)
  const index = Math.floor(angle / 6) // 0-59
  if (index === 0) return 'Kimstughna'
  if (index >= 57) return KARANA_FIXED_END[index - 57]
  return KARANA_MOVABLE[(index - 1) % 7]
}

export function getNakshatraOfDay(moonLongitude: number): Nakshatra {
  return getNakshatra(moonLongitude).nakshatra
}

export interface MuhurtaWindow {
  start: string // HH:MM local
  end: string
}

// Day divided into 8 equal segments between sunrise and sunset; each
// weekday has a fixed segment (1-indexed) assigned to each inauspicious
// window — the standard table used by virtually every panchang reference.
const RAHU_KALAM_SEGMENT = [8, 2, 7, 5, 6, 4, 3] // Sun..Sat
const YAMAGANDA_SEGMENT = [5, 4, 3, 2, 1, 7, 6]
const GULIKA_KALAM_SEGMENT = [7, 6, 5, 4, 3, 2, 1]

function segmentWindow(sunriseMinutes: number, daylenMinutes: number, segment: number): MuhurtaWindow {
  const segmentLen = daylenMinutes / 8
  const startMin = sunriseMinutes + (segment - 1) * segmentLen
  const endMin = startMin + segmentLen
  return { start: minutesToHHMM(startMin), end: minutesToHHMM(endMin) }
}

function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = Math.round(totalMinutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// `weekday` is 0=Sunday..6=Saturday (JS Date convention). Sunrise/sunset
// given as local "minutes since midnight" (already timezone-adjusted by
// the caller, since this function does no timezone math itself).
export function getMuhurtaWindows(weekday: number, sunriseMinutes: number, sunsetMinutes: number) {
  const daylen = sunsetMinutes - sunriseMinutes
  return {
    rahuKalam: segmentWindow(sunriseMinutes, daylen, RAHU_KALAM_SEGMENT[weekday]),
    yamaganda: segmentWindow(sunriseMinutes, daylen, YAMAGANDA_SEGMENT[weekday]),
    gulikaKalam: segmentWindow(sunriseMinutes, daylen, GULIKA_KALAM_SEGMENT[weekday]),
  }
}

// Choghadiya (astrology.md 3.9) — day (sunrise-sunset) and night
// (sunset-next sunrise) each split into 8 equal blocks, labeled from a
// fixed 7-name cycle that wraps (8 mod 7 = 1, so a day's 8th block repeats
// its 1st block's name). Day and night use DIFFERENT cycles/weekday-start
// tables — this isn't one continuous rotation across day into night, it's
// two independently-published traditional sequences. Verified 2026-08-18:
// all 16 blocks (name + order, both day and night) for 2026-01-14 (a
// Wednesday), New Delhi, matched Drik Panchang's published Choghadiya table
// for that exact date/location exactly — day starts Labh (07:15), night
// starts Udveg (17:45), full 8-block sequence in both matched in order.
const CHOGHADIYA_TYPE: Record<string, 'good' | 'neutral' | 'bad'> = {
  Amrit: 'good', Shubh: 'good', Labh: 'good',
  Chal: 'neutral',
  Rog: 'bad', Kaal: 'bad', Udveg: 'bad',
}

const DAY_CYCLE = ['Udveg', 'Chal', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog']
const DAY_START_INDEX = [0, 3, 6, 2, 5, 1, 4] // Sun..Sat, e.g. Sunday's first day-block is Udveg

const NIGHT_CYCLE = ['Shubh', 'Amrit', 'Chal', 'Rog', 'Kaal', 'Labh', 'Udveg']
const NIGHT_START_INDEX = [0, 2, 4, 6, 1, 3, 5] // Sun..Sat, e.g. Sunday's first night-block is Shubh

function buildChoghadiyaBlocks(cycle: string[], startIndex: number, spanStartMinutes: number, spanLengthMinutes: number, period: 'day' | 'night'): ChoghadiyaBlock[] {
  const blockLen = spanLengthMinutes / 8
  return Array.from({ length: 8 }, (_, i) => {
    const name = cycle[(startIndex + i) % 7]
    const start = spanStartMinutes + i * blockLen
    return { name, type: CHOGHADIYA_TYPE[name], period, start: minutesToHHMM(start), end: minutesToHHMM(start + blockLen) }
  })
}

// `weekday` (0=Sun..6=Sat) is the calendar day the sunrise falls on — it
// governs both the day and night sequence, standard convention.
// `nightLengthMinutes` is sunset-to-*next*-sunrise, not assumed equal to
// the day's own length (they differ by more than a few minutes for much of
// the year away from the equinoxes).
export function getChoghadiya(weekday: number, sunriseMinutes: number, sunsetMinutes: number, nightLengthMinutes: number): ChoghadiyaBlock[] {
  const dayLen = sunsetMinutes - sunriseMinutes
  return [
    ...buildChoghadiyaBlocks(DAY_CYCLE, DAY_START_INDEX[weekday], sunriseMinutes, dayLen, 'day'),
    ...buildChoghadiyaBlocks(NIGHT_CYCLE, NIGHT_START_INDEX[weekday], sunsetMinutes, nightLengthMinutes, 'night'),
  ]
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// The currently-active block out of the 16 `getChoghadiya()` computes for a
// day — a night block that runs past midnight has a numerically smaller end
// than start (e.g. 23:50-01:20), so "now" matches it either past its start
// or before its end, not a plain start<=now<end range check. Used by the
// Telegram panchang reply and the astrology-daily cron push (both wire this
// up 2026-08-18 — no UI/bot consumer read Choghadiya before that).
export function getCurrentChoghadiyaBlock(blocks: ChoghadiyaBlock[], nowHHMM: string): ChoghadiyaBlock | null {
  const nowMin = hhmmToMinutes(nowHHMM)
  return blocks.find(b => {
    const startMin = hhmmToMinutes(b.start)
    const endMin = hhmmToMinutes(b.end)
    return endMin < startMin ? (nowMin >= startMin || nowMin < endMin) : (nowMin >= startMin && nowMin < endMin)
  }) ?? null
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}
