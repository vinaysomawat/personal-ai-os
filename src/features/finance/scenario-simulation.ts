import type { FinanceProfile, FinancialGoal } from './types'

export interface PurchaseScenarioInput {
  totalCost: number
  paidUpfront: number
  emiAmount: number
  emiDurationMonths: number
}

interface GoalPace {
  name: string
  remaining: number
  // null when free cash after the purchase can't fund it at all (<=0)
  monthsAtNewFreeCash: number | null
}

export interface PurchaseScenarioResult {
  freeCashBefore: number
  freeCashAfter: number
  goesNegative: boolean
  goalPaces: GoalPace[]
}

// Scenario Simulation (Phase 4 PRD), scoped to cash-flow impact only — no
// modeling of which savings pool a down payment draws from (see spec: no
// field distinguishes that, so it would mean inventing an assumption rather
// than using a real number). Pure deterministic math, no AI (Product
// Principle 2) — reuses the exact freeCash formula finance-advisor.ts
// already uses (salary - avgMonthlyExpense; avgMonthlyExpense already
// includes logged EMI payments, so existing EMIs aren't double-subtracted).
export function computePurchaseScenario(
  profile: FinanceProfile | null,
  avgMonthlyExpense: number,
  goals: FinancialGoal[],
  input: PurchaseScenarioInput
): PurchaseScenarioResult {
  const salary = profile?.monthly_salary ?? 0
  const freeCashBefore = salary - avgMonthlyExpense
  const freeCashAfter = freeCashBefore - input.emiAmount

  // "If all new free cash went to this one goal" — a simplification stated
  // explicitly in the UI, not a real forecast (goals aren't individually
  // funded/tracked, only a target/current snapshot exists).
  const goalPaces: GoalPace[] = goals.map(g => {
    const remaining = Math.max(0, g.target_amount - g.current_amount)
    let monthsAtNewFreeCash: number | null = 0
    if (remaining > 0) monthsAtNewFreeCash = freeCashAfter > 0 ? Math.ceil(remaining / freeCashAfter) : null
    return { name: g.name, remaining, monthsAtNewFreeCash }
  })

  return { freeCashBefore, freeCashAfter, goesNegative: freeCashAfter < 0, goalPaces }
}
