import type { NatalChart, Planet, RemedyItem } from './types'

// Curated deterministic reference — per astrology.md, remediation text must
// trace back to a fixed table, never be AI-invented (same anti-hallucination
// stance as every other module's recommender). Narration is templated text
// substitution here, not an AI Gateway call at all — there's nothing
// interpretive about "what is the traditional remedy for X," only "which
// remedies apply to this chart," which the house lookup below already
// answers deterministically.
const REMEDY_TEMPLATES: Partial<Record<Planet, RemedyItem[]>> = {
  Saturn: [
    { title: 'Saturn remedy — Saturdays', text: "Chant the Shani mantra or visit a Shani temple on Saturdays, tied to Saturn's placement in your {house}th house." },
    { title: 'Charity on Saturdays', text: 'Donating black sesame seeds, iron, or black clothing on Saturdays is a traditional offering for an afflicted Saturn.' },
  ],
  Mars: [
    { title: 'Mars remedy — Tuesdays', text: "Chant the Mangala mantra or offer red flowers on Tuesdays, tied to Mars's placement in your {house}th house." },
  ],
  Rahu: [
    { title: 'Rahu remedy', text: "Donating mustard oil or dark-colored grains on Saturdays is a traditional offering for Rahu's placement in your {house}th house." },
  ],
  Ketu: [
    { title: 'Ketu remedy', text: "Donating multi-colored blankets or sesame on Tuesdays is a traditional offering for Ketu's placement in your {house}th house." },
  ],
  Moon: [
    { title: 'Moon remedy', text: 'Offering water to the Moon (Chandra Arghya) on full moon nights is a traditional practice for a {house}th-house Moon placement.' },
  ],
}

// Traditionally the most commonly consulted grahas for remediation — the
// classical malefics (Saturn/Mars/Rahu/Ketu) plus the Moon when its
// placement calls for it. Capped at 3 to match the card's scope; priority
// order fixed rather than picked by any scoring heuristic, since severity
// scoring would just be inventing a rule astrology.md never specified.
const PRIORITY_ORDER: Planet[] = ['Saturn', 'Rahu', 'Ketu', 'Mars', 'Moon']

export function getRemediation(chart: NatalChart, limit = 3): RemedyItem[] {
  const items: RemedyItem[] = []
  for (const planet of PRIORITY_ORDER) {
    if (items.length >= limit) break
    const templates = REMEDY_TEMPLATES[planet]
    const position = chart.planets.find(p => p.planet === planet)
    if (!templates || !position) continue
    for (const t of templates) {
      if (items.length >= limit) break
      items.push({ title: t.title, text: t.text.replace('{house}', String(position.house)) })
    }
  }
  return items
}
