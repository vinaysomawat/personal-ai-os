import type { Nakshatra } from './types'
import { getNakshatra } from './chart-calculations'

// Deterministic Hindu daily calendar — tithi/yoga/karana all derive from
// the Sun-Moon angular relationship, which is ayanamsa-independent (it's a
// difference of two sidereal longitudes, so the ayanamsa offset cancels
// out identically whether tropical or sidereal longitudes are used).
// Global/calendar-wide — no birth data, no user_id, same "compute once,
// reuse everywhere" pattern as coding_questions/workout_library.

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

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}
