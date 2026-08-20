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
