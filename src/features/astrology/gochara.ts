import type { GocharaPosition, NatalChart } from './types'
import type { RawPosition } from './ephemeris'
import { getRashi, getHouse } from './chart-calculations'

// Current transit positions relative to the natal chart — dasha says
// *which* life theme is active, gochara says how the present sky affects
// it. Always computed fresh for "now," never stored (unlike D1/D9/dashas,
// fixed at birth) — a simple first pass surfacing house-from-Lagna and
// house-from-Moon for every transiting planet. Ashtakavarga-based transit
// significance scoring is a reasonable later addition, not required here
// per astrology.md's 3.2 scope.
export function computeGochara(transitRaw: RawPosition[], natalChart: NatalChart): GocharaPosition[] {
  const natalMoon = natalChart.planets.find(p => p.planet === 'Moon')!
  return transitRaw.map(r => {
    const { rashi } = getRashi(r.siderealLongitude)
    return {
      planet: r.planet,
      rashi,
      houseFromLagna: getHouse(rashi, natalChart.lagna.rashi),
      houseFromMoon: getHouse(rashi, natalMoon.rashi),
      retrograde: r.retrograde,
    }
  })
}

// Chandrashtama (astrology.md 3.2/3.7) — true when the transiting Moon sits
// in the 8th house from the natal Moon, a well-defined traditional
// rule-of-thumb marking an emotionally lower/more cautious day. The
// transiting Moon's own gochara entry already carries houseFromMoon (every
// planet's position is expressed relative to the natal Moon, including the
// Moon's own transit), so this is a lookup, not a new calculation. Verified
// 2026-08-18 against two real dates for a natal Moon in Vrishabha (8th house
// = Dhanu): 2026-01-17 noon IST, transiting Moon at 255.26° sidereal (Dhanu)
// → houseFromMoon 8 → Chandrashtama true; 2026-01-05 noon IST, transiting
// Moon at 105.83° (Karka) → houseFromMoon 3 → Chandrashtama false — both
// computed independently via swisseph-wasm directly (bypassing this
// module's own callers), confirming `getHouse()` fires correctly on
// unambiguous real dates, not just in the abstract.
export function isChandrashtama(gochara: GocharaPosition[]): boolean {
  const transitingMoon = gochara.find(g => g.planet === 'Moon')
  return transitingMoon?.houseFromMoon === 8
}
