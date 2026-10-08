import type { PrepBlock } from './types'
import { formatMinutes } from './mock'

export interface PrepPlanContext {
  // Weakest readiness area that maps to a quiz topic (for quiz-based blocks).
  weakestTopic: { area: string; topic: string } | null
  uncoveredCompetency: string | null
  codingPicks: { category: string; title: string }[]
}

// Weekly focus rotation (ROADMAP-v2 §2.1). Deterministic — the day's plan
// is fixed once generated (persisted in prep_sessions), so it doesn't shift
// under you mid-day as data changes.
const FOCUS: Record<number, string> = {
  0: 'Review & reset',
  1: 'JavaScript & TypeScript depth',
  2: 'React & Next.js internals',
  3: 'Frontend system design',
  4: 'UI coding',
  5: 'Behavioral & leadership',
  6: 'Mock round',
}

export function buildPrepPlan(date: string, ctx: PrepPlanContext): { focus: string; blocks: PrepBlock[] } {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  const pick = (category: string) => ctx.codingPicks.find(p => p.category === category) ?? null
  const weakTopic = ctx.weakestTopic?.topic ?? 'JavaScript'

  let main: PrepBlock
  switch (weekday) {
    case 1: {
      const js = pick('javascript-functions')
      main = js
        ? { key: 'main', label: 'Implement a JS function', detail: `Solve "${js.title}" without looking anything up, then note your approach`, minutes: 30, href: '/coding', done: false }
        : { key: 'main', label: 'JavaScript quiz', detail: '10-question JavaScript or TypeScript quiz, then review every miss', minutes: 25, href: '/career', done: false }
      break
    }
    case 2:
      main = { key: 'main', label: 'React internals quiz', detail: '10-question React (or Next.js / State Management) quiz — explain each wrong answer out loud', minutes: 25, href: '/career', done: false }
      break
    case 3:
      main = { key: 'main', label: 'Frontend system design', detail: 'System Design quiz, then outline one design (Requirements → Architecture → Data → Interface → Optimizations) in 20 min', minutes: 30, href: '/career', done: false }
      break
    case 4: {
      const ui = pick('ui-coding')
      main = ui
        ? { key: 'main', label: 'Build a UI component', detail: `Build "${ui.title}" — accessible, keyboard-navigable, with a note on trade-offs`, minutes: 30, href: '/coding', done: false }
        : { key: 'main', label: 'Build a UI component', detail: 'Build any UI coding question from the pool, accessible and keyboard-navigable', minutes: 30, href: '/coding', done: false }
      break
    }
    case 5:
      main = { key: 'main', label: 'Rehearse stories', detail: 'Answer 2 "Tell me about a time…" prompts out loud; get written feedback on one', minutes: 25, href: '/prep?tab=stories', done: false }
      break
    case 6:
      // Auto-ticks when a Mock Round is saved (key 'mock').
      main = { key: 'mock', label: 'Mock round', detail: 'Frontend screen: 6 questions under the clock, no notes, then read the key points and get AI review', minutes: formatMinutes('screen'), href: '/prep?tab=mock&format=screen', done: false }
      break
    default:
      main = { key: 'main', label: 'Weekly review', detail: 'Check the readiness matrix and mock-round history, pick next week\'s weakest area', minutes: 15, href: '/prep', done: false }
  }

  // A quick quiz on the weakest area (the daily-read option went with the
  // Learning module, removed 2026-10-08).
  const concept: PrepBlock = { key: 'concept', label: 'Concept quiz', detail: `Quick quiz on your weakest area: ${weakTopic}`, minutes: 10, href: '/career', done: false }

  const lead: PrepBlock = ctx.uncoveredCompetency && weekday !== 5
    ? { key: 'lead', label: 'Leadership rep', detail: `Draft a STAR story for "${ctx.uncoveredCompetency}" — you have none yet`, minutes: 5, href: '/prep?tab=stories', done: false }
    : { key: 'lead', label: 'Leadership rep', detail: 'Rehearse one story, or strengthen your weakest-rated one', minutes: 5, href: '/prep?tab=stories', done: false }

  return { focus: FOCUS[weekday], blocks: [main, concept, lead] }
}
