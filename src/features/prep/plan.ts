import type { PrepBlock } from './types'
import { formatMinutes } from './mock'

export interface PrepPlanContext {
  // Weakest readiness area that maps to a quiz topic (for quiz-based blocks).
  weakestTopic: { area: string; topic: string } | null
  uncoveredCompetency: string | null
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
  const weakTopic = ctx.weakestTopic?.topic ?? 'JavaScript'

  let main: PrepBlock
  switch (weekday) {
    case 1:
      // Question Bank blocks (the daily Coding picks were folded into Prep,
      // 2026-10-10); the "× 1" label lets them auto-tick like hunt blocks.
      main = { key: 'bank:javascript-functions', label: 'JS functions × 1', detail: 'Implement one JS function without looking anything up (polyfills, debounce, promise utilities), handle edge cases', minutes: 30, href: '/prep?tab=questions&cat=javascript-functions', done: false }
      break
    case 2:
      main = { key: 'main', label: 'React internals', detail: 'Answer 8 React / Next.js questions out loud — get the AI rating and tighten the weakest answer', minutes: 25, href: '/prep?tab=questions&cat=quiz&topic=React%20%26%20State%20Management', done: false }
      break
    case 3:
      main = { key: 'main', label: 'Frontend system design', detail: 'Outline one design (Requirements → Architecture → Data → Interface → Optimizations) in 25 min, then get the AI rating', minutes: 30, href: '/prep?tab=questions&cat=system-design', done: false }
      break
    case 4:
      main = { key: 'bank:ui-coding', label: 'UI coding × 1', detail: 'Build one component from scratch — accessible, keyboard-navigable, with a note on trade-offs', minutes: 45, href: '/prep?tab=questions&cat=ui-coding', done: false }
      break
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

  // A few theory questions on the weakest area (the daily-read option went
  // with Learning, and the Career topic quiz with Career's revamp, 2026-10-08).
  const concept: PrepBlock = { key: 'concept', label: 'Concept rep', detail: `3 theory questions on your weakest area: ${weakTopic}`, minutes: 10, href: '/prep?tab=questions&cat=quiz', done: false }

  const lead: PrepBlock = ctx.uncoveredCompetency && weekday !== 5
    ? { key: 'lead', label: 'Leadership rep', detail: `Draft a STAR story for "${ctx.uncoveredCompetency}" — you have none yet`, minutes: 5, href: '/prep?tab=stories', done: false }
    : { key: 'lead', label: 'Leadership rep', detail: 'Rehearse one story, or strengthen your weakest-rated one', minutes: 5, href: '/prep?tab=stories', done: false }

  return { focus: FOCUS[weekday], blocks: [main, concept, lead] }
}
