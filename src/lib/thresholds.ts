// Tunable thresholds for the Risk/Opportunity/Automation Rules engines
// (src/features/brain/risk-opportunity-engine.ts). Pulled into one file so
// "how sensitive should this signal be" is a single place to look/change,
// instead of magic numbers scattered across the engine's checks. Changing
// a value here still needs a redeploy — there's no in-app settings UI for
// these (not worth building until real experience with the current values
// suggests they need frequent tuning).

export const RISK_THRESHOLDS = {
  // Budget pace risk fires once the projected month-end spend exceeds the
  // budget by at least this fraction; impact tier scales with how far over.
  budgetOverageMinRatio: 0.05,
  budgetOverageHighImpactRatio: 0.25,
  budgetOverageMediumImpactRatio: 0.15,

  // Protein decline risk: recent-3-day avg vs. the prior 3 days.
  proteinDeclineMinRatio: 0.2,
  proteinDeclineLookbackDays: 6,
  proteinDeclineWindowDays: 3,

  // Coding streak risk: streak length at/above which an unsolved today
  // bumps from medium to high impact.
  codingStreakHighImpactDays: 7,
} as const

export const AUTOMATION_RULE_THRESHOLDS = {
  // Yesterday's logged calories over target, as a fraction, before the
  // "lighter meals today" nudge fires.
  calorieOverageMinRatio: 0.15,
  metricsLookbackDays: 14,
} as const

export const OPPORTUNITY_THRESHOLDS = {
  // Active interview-stage applications at/above which the "momentum"
  // opportunity (batch-schedule extra practice) fires.
  interviewMomentumMinCount: 3,
} as const

// Life Score v2 (2026-08-23) — every module score is a blend of today's fresh
// daily raw score and the trailing-7-day average of that same raw score, so
// one good/bad day moves the number without either fully erasing a real week
// or letting one lucky day carry it. Not a fixed constant — this is the one
// knob to turn if "today matters more" or "consistency matters more" feels
// off in practice. See README §1 for the full formula.
export const LIFE_SCORE_THRESHOLDS = {
  dailyWeight: 0.6,
  weeklyWeight: 0.4,
  // Coding category weights for the Projects/Coding sub-score — algorithm and
  // system-design questions count for more than the shorter quiz/JS-function/
  // UI-coding picks.
  codingCategoryWeight: {
    algorithm: 1.0,
    'system-design': 1.5,
    quiz: 0.6,
    'javascript-functions': 0.6,
    'ui-coding': 0.6,
  } as Record<string, number>,
  codingWeightedMultiplier: 3.2,
} as const

export const FINANCE_THRESHOLDS = {
  // Finance page's over-budget banner ignores a category overage smaller
  // than this fraction of its budget — e.g. an EMI that runs ₹420 over a
  // ₹35,000 budget is rounding noise, not something to alarm on every month.
  // The category row's own "Over" badge still shows it.
  overBudgetBannerMinRatio: 0.02,
} as const

export const PLANNER_THRESHOLDS = {
  // Auto-generated Planner tasks (daily coding picks, daily reads) still open
  // after this many days are removed from Planner by the daily-coding cron —
  // the question/resource itself stays pending in Practice Log/Resources.
  // Without it, 4+ auto-tasks/day piled up to 100+ open tasks, all stale.
  staleAutoTaskDays: 3,
} as const
