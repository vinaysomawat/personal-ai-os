import { getCurrentChoghadiyaBlock } from './panchang'
import { UI_HI, NAKSHATRA_HI, TITHI_HI, CHOGHADIYA_NAME_HI, PAKSHA_HI } from './i18n/hi'
import type { DailyReading, PanchangDaily } from './types'

// Telegram-only layout for the Astrology bot and the astrology-daily push —
// short bullets instead of paragraphs (2026-09-24, "make it specific and
// crisp"). Purely presentational and deterministic: the AI output (and its
// cache, shared with the web page) is unchanged; this trims and reshapes it.

// Splits prose into sentences (Hindi "।" or . ! ?).
export function sentences(text: string): string[] {
  return text.split(/(?<=[।.!?])\s+/).map(s => s.trim()).filter(Boolean)
}

function firstSentence(text: string): string {
  return sentences(text)[0] ?? text.trim()
}

// Strip trailing punctuation so short bullet phrases read as phrases.
function phrase(s: string): string {
  return s.trim().replace(/[।.;]+$/, '')
}

export function bullets(items: string[], max: number): string {
  return items.slice(0, max).map(i => `• ${phrase(i)}`).join('\n')
}

// Prose reading (monthly/yearly) or characteristics → up to `max` sentence
// bullets.
export function bulletizeProse(text: string, max: number): string {
  return bullets(sentences(text), max)
}

export function formatPanchangLines(panchang: PanchangDaily, nowHHMM: string, full = false): string {
  const tithi = TITHI_HI[panchang.tithi] ?? panchang.tithi
  const paksha = PAKSHA_HI[panchang.paksha] ?? panchang.paksha
  const nakshatra = NAKSHATRA_HI[panchang.nakshatra as keyof typeof NAKSHATRA_HI] ?? panchang.nakshatra
  const lines = [
    `📅 ${tithi} (${paksha}) · ${nakshatra}`,
    `🌅 ${panchang.sunrise} – ${panchang.sunset}`,
    `⚠️ ${UI_HI.rahuKalam}: ${panchang.rahu_kalam_start}–${panchang.rahu_kalam_end}`,
  ]
  if (full) {
    lines.push(`⚠️ ${UI_HI.yamaganda}: ${panchang.yamaganda_start}–${panchang.yamaganda_end}`)
    lines.push(`⚠️ ${UI_HI.gulikaKalam}: ${panchang.gulika_kalam_start}–${panchang.gulika_kalam_end}`)
  }
  const block = getCurrentChoghadiyaBlock(panchang.choghadiya ?? [], nowHHMM)
  if (block) {
    const emoji = block.type === 'good' ? '✅' : block.type === 'bad' ? '⛔' : '➖'
    const name = CHOGHADIYA_NAME_HI[block.name] ?? block.name
    lines.push(`${emoji} ${UI_HI.choghadiyaNow}: ${name} (${block.end} ${UI_HI.until})`)
  }
  return lines.join('\n')
}

// Daily reading as a scannable card: one-line gist, ≤3 favorable, ≤2
// avoid, one-line mood — instead of the flattened multi-paragraph prose.
export function formatDailyReading(daily: DailyReading): string {
  const parts = [`✨ ${phrase(firstSentence(daily.summary))}`]
  if (daily.isChandrashtama) parts.push('🌙 चंद्राष्टम — पारंपरिक रूप से कम ऊर्जा वाला दिन')
  if (daily.favorableFor.length) parts.push(`*✅ ${UI_HI.favorableFor}*\n${bullets(daily.favorableFor, 3)}`)
  if (daily.avoid.length) parts.push(`*⛔ ${UI_HI.avoid}*\n${bullets(daily.avoid, 2)}`)
  if (daily.moodForecast) parts.push(`🙂 ${phrase(firstSentence(daily.moodForecast))}`)
  return parts.join('\n\n')
}
