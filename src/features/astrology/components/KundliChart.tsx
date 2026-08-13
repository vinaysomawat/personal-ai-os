import type { PlanetPosition, Rashi } from '../types'

// North Indian style: houses are FIXED positions (house 1 always top-center,
// numbered counter-clockwise from there) — unlike South Indian charts where
// signs are fixed and houses rotate. Geometry: an outer square, both full
// diagonals, and a diamond connecting the four side-midpoints, together
// dividing the square into exactly 12 regions — 4 kite-shaped "kendra"
// houses (1/4/7/10, each touching one side-midpoint and the center) and 8
// corner triangles (2 per corner, split by the diagonal passing through
// that corner). All coordinates below were derived directly from that
// construction on a 400x400 grid, not eyeballed.
const HOUSE_POLYGONS: Record<number, [number, number][]> = {
  1: [[200, 0], [300, 100], [200, 200], [100, 100]],
  2: [[0, 0], [200, 0], [100, 100]],
  3: [[0, 0], [100, 100], [0, 200]],
  4: [[0, 200], [100, 100], [200, 200], [100, 300]],
  5: [[0, 200], [100, 300], [0, 400]],
  6: [[0, 400], [100, 300], [200, 400]],
  7: [[200, 400], [300, 300], [200, 200], [100, 300]],
  8: [[200, 400], [300, 300], [400, 400]],
  9: [[400, 400], [300, 300], [400, 200]],
  10: [[400, 200], [300, 300], [200, 200], [300, 100]],
  11: [[400, 200], [300, 100], [400, 0]],
  12: [[400, 0], [300, 100], [200, 0]],
}

// Where to anchor each house's rashi-number + planet-abbreviation text —
// a fixed reasonable point inside each polygon, not a computed centroid
// (the kite houses in particular don't centroid-anchor cleanly).
const LABEL_ANCHOR: Record<number, [number, number]> = {
  1: [200, 55], 2: [95, 35], 3: [35, 95], 4: [80, 190],
  5: [35, 305], 6: [95, 365], 7: [200, 345], 8: [305, 365],
  9: [365, 305], 10: [320, 190], 11: [365, 95], 12: [305, 35],
}

const RASHI_ORDER: Rashi[] = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
]

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}

function polygonPoints(house: number): string {
  return HOUSE_POLYGONS[house].map(([x, y]) => `${x},${y}`).join(' ')
}

export default function KundliChart({ lagnaRashi, planets }: { lagnaRashi: Rashi; planets: PlanetPosition[] }) {
  const lagnaIndex = RASHI_ORDER.indexOf(lagnaRashi)
  const planetsByHouse = planets.reduce<Record<number, PlanetPosition[]>>((acc, p) => {
    (acc[p.house] ??= []).push(p)
    return acc
  }, {})

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[360px] mx-auto" role="img" aria-label="North Indian style natal chart">
      <rect x={0} y={0} width={400} height={400} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />
      {Object.keys(HOUSE_POLYGONS).map(h => (
        <polygon key={h} points={polygonPoints(Number(h))} fill="none" stroke="var(--border-strong)" strokeWidth={1} />
      ))}
      {Object.entries(LABEL_ANCHOR).map(([houseStr, [x, y]]) => {
        const house = Number(houseStr)
        const rashiNumber = ((lagnaIndex + house - 1) % 12) + 1
        const occupants = planetsByHouse[house] ?? []
        return (
          <g key={house}>
            <text x={x} y={y - 14} textAnchor="middle" className="fill-fg-tertiary" style={{ fontSize: 9 }}>{rashiNumber}</text>
            {occupants.map((p, i) => (
              <text key={p.planet} x={x} y={y + i * 13} textAnchor="middle" className="fill-fg-primary font-semibold" style={{ fontSize: 11 }}>
                {PLANET_ABBR[p.planet]}{p.retrograde ? '(R)' : ''}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
