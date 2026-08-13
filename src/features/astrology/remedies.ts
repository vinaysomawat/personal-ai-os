import type { NatalChart, Planet, RemedyItem } from './types'
import type { Lang } from './i18n/hi'

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

// Hindi mirror of REMEDY_TEMPLATES, not a runtime translation of it — same
// curated-table discipline applies per language (astrology.md 3.6: dynamic
// content generates natively in the target language, it isn't machine-
// translated after the fact).
const REMEDY_TEMPLATES_HI: Partial<Record<Planet, RemedyItem[]>> = {
  Saturn: [
    { title: 'शनि उपाय — शनिवार', text: 'शनिवार को शनि मंत्र का जाप करें या शनि मंदिर जाएँ — यह आपकी कुंडली के {house}वें भाव में शनि की स्थिति से जुड़ा है।' },
    { title: 'शनिवार को दान', text: 'पीड़ित शनि के लिए काले तिल, लोहा या काले वस्त्र का दान शनिवार को एक पारंपरिक उपाय है।' },
  ],
  Mars: [
    { title: 'मंगल उपाय — मंगलवार', text: 'मंगलवार को मंगल मंत्र का जाप करें या लाल फूल अर्पित करें — यह आपकी कुंडली के {house}वें भाव में मंगल की स्थिति से जुड़ा है।' },
  ],
  Rahu: [
    { title: 'राहु उपाय', text: 'शनिवार को सरसों का तेल या काले अनाज का दान आपकी कुंडली के {house}वें भाव में राहु की स्थिति के लिए एक पारंपरिक उपाय है।' },
  ],
  Ketu: [
    { title: 'केतु उपाय', text: 'मंगलवार को बहुरंगी कंबल या तिल का दान आपकी कुंडली के {house}वें भाव में केतु की स्थिति के लिए एक पारंपरिक उपाय है।' },
  ],
  Moon: [
    { title: 'चंद्र उपाय', text: 'पूर्णिमा की रात चंद्रमा को जल अर्पित करना (चंद्र अर्घ्य) {house}वें भाव के चंद्र स्थान के लिए एक पारंपरिक अभ्यास है।' },
  ],
}

// Traditionally the most commonly consulted grahas for remediation — the
// classical malefics (Saturn/Mars/Rahu/Ketu) plus the Moon when its
// placement calls for it. Capped at 3 to match the card's scope; priority
// order fixed rather than picked by any scoring heuristic, since severity
// scoring would just be inventing a rule astrology.md never specified.
const PRIORITY_ORDER: Planet[] = ['Saturn', 'Rahu', 'Ketu', 'Mars', 'Moon']

export function getRemediation(chart: NatalChart, limit = 3, lang: Lang = 'en'): RemedyItem[] {
  const table = lang === 'hi' ? REMEDY_TEMPLATES_HI : REMEDY_TEMPLATES
  const items: RemedyItem[] = []
  for (const planet of PRIORITY_ORDER) {
    if (items.length >= limit) break
    const templates = table[planet]
    const position = chart.planets.find(p => p.planet === planet)
    if (!templates || !position) continue
    for (const t of templates) {
      if (items.length >= limit) break
      items.push({ title: t.title, text: t.text.replace('{house}', String(position.house)) })
    }
  }
  return items
}
