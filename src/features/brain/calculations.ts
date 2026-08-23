import type { ScoreExplanation, ScoreExplanationResult, ScoreModule } from './types'

const MODULE_LABEL: Record<ScoreModule, string> = {
  health: 'Health', finance: 'Finance', career: 'Career', learning: 'Learning', projects: 'Coding',
}

export interface ModuleBreakdown {
  today: number
  weeklyAvg: number
  blended: number
  delta: number | null
}

// "Explain My Score" — deterministic, no AI call (Product Principle 2). All
// the actual blending math (today's raw score × 0.6 + trailing-7-day average
// × 0.4, and the day-over-day delta of that blend) happens in
// getDashboardData() where the raw history already lives; this function is
// just sorting/labeling the finished per-module breakdown, plus the "why"
// from the same scoreTips already shown elsewhere.
export function explainScore(
  breakdown: Record<ScoreModule, ModuleBreakdown>,
  life: { score: number; delta: number | null },
  scoreTips: Record<ScoreModule, string>,
): ScoreExplanationResult {
  const modules: ScoreExplanation[] = (['health', 'finance', 'career', 'learning', 'projects'] as ScoreModule[])
    .map(module => ({
      module,
      label: MODULE_LABEL[module],
      today: breakdown[module].today,
      weeklyAvg: breakdown[module].weeklyAvg,
      blended: breakdown[module].blended,
      delta: breakdown[module].delta,
      tip: scoreTips[module],
    }))
    // Biggest movers first — improvements and regressions both surface above "no change"
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))

  return { life, modules }
}
