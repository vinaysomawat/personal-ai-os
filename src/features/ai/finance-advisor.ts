'use server'

import { askAI } from '@/lib/ai-gateway'
import type { FinanceProfile, Loan, Investment, FinancialGoal } from '@/features/finance/types'
import { loanOutstanding } from '@/features/finance/calculations'
import type { PurchaseScenarioInput, PurchaseScenarioResult } from '@/features/finance/scenario-simulation'

interface FinancialContext {
  profile: FinanceProfile | null
  loans: Loan[]
  investments: Investment[]
  goals: FinancialGoal[]
  avgMonthlyExpense: number
}

export async function askFinanceAdvisor(question: string, ctx: FinancialContext): Promise<string> {
  const totalDebt = ctx.loans.reduce((s, l) => s + loanOutstanding(l), 0)
  const totalEMIs = ctx.loans.reduce((s, l) => s + l.emi, 0)
  const portfolio = ctx.investments.reduce((s, i) => s + i.current_value, 0)
  const invested = ctx.investments.reduce((s, i) => s + i.invested_amount, 0)
  const salary = ctx.profile?.monthly_salary ?? 0
  // avgMonthlyExpense already includes EMI payments logged as expenses —
  // don't also subtract totalEMIs on top, that double-counts it (see the
  // same note on totalSpent/totalBudget in FinanceView.tsx).
  const freeCash = salary - ctx.avgMonthlyExpense

  const context = `Vinay's financial snapshot:
- Monthly salary: ₹${salary.toLocaleString('en-IN')}
- Monthly EMIs: ₹${totalEMIs.toLocaleString('en-IN')} (${ctx.loans.map(l => `${l.name}: ₹${l.emi.toLocaleString('en-IN')}/mo, ${l.remaining_months ?? '?'} months left`).join('; ') || 'none'})
- Avg monthly expenses: ₹${ctx.avgMonthlyExpense.toLocaleString('en-IN')}
- Free cash per month: ₹${freeCash.toLocaleString('en-IN')}
- Investment portfolio: ₹${portfolio.toLocaleString('en-IN')} (invested ₹${invested.toLocaleString('en-IN')}, P&L: ₹${(portfolio - invested).toLocaleString('en-IN')})
${ctx.investments.map(i => `  • ${i.name} (${i.type}): invested ₹${i.invested_amount.toLocaleString('en-IN')}, current ₹${i.current_value.toLocaleString('en-IN')}`).join('\n')}
- Outstanding loan principal: ₹${totalDebt.toLocaleString('en-IN')}
- Financial goals: ${ctx.goals.map(g => `${g.name} (target ₹${g.target_amount.toLocaleString('en-IN')}, saved ₹${g.current_amount.toLocaleString('en-IN')}${g.target_date ? `, by ${g.target_date}` : ''})`).join('; ') || 'none set'}
- Emergency fund target: ${ctx.profile?.emergency_fund_months ?? 6} months of expenses = ₹${((ctx.profile?.emergency_fund_months ?? 6) * ctx.avgMonthlyExpense).toLocaleString('en-IN')}

Question: ${question}`

  return askAI('finance_advisor', context, `You are Vinay's personal finance advisor. Give sharp, specific, numbers-driven advice tailored to his exact situation.
Reference his actual salary, EMIs, and investments. Be direct — don't hedge everything.
If recommending an investment or loan decision, give a clear verdict with reasoning. Keep it under 200 words.`)
}

// Scenario Simulation (Phase 4 PRD) — narrates the deterministic result from
// computePurchaseScenario(). AI never computes the numbers, only explains
// them; the prompt hands over every figure already computed, so there's
// nothing left to invent.
export async function narratePurchaseScenario(input: PurchaseScenarioInput, result: PurchaseScenarioResult): Promise<string> {
  const goalLines = result.goalPaces.length > 0
    ? result.goalPaces.map(g => g.remaining === 0
        ? `${g.name}: already funded`
        : g.monthsAtNewFreeCash === null
          ? `${g.name}: ₹${g.remaining.toLocaleString('en-IN')} remaining, unfundable at this new free cash level`
          : `${g.name}: ₹${g.remaining.toLocaleString('en-IN')} remaining, ~${g.monthsAtNewFreeCash} months if all new free cash went to it`
      ).join('; ')
    : 'no goals set'

  const context = `Vinay is considering a purchase: total cost ₹${input.totalCost.toLocaleString('en-IN')}, ₹${input.paidUpfront.toLocaleString('en-IN')} paid upfront, financed with a ₹${input.emiAmount.toLocaleString('en-IN')}/month EMI for ${input.emiDurationMonths} months.

Free cash per month before: ₹${result.freeCashBefore.toLocaleString('en-IN')}
Free cash per month after: ₹${result.freeCashAfter.toLocaleString('en-IN')}
${result.goesNegative ? 'This would put monthly cash flow NEGATIVE.' : ''}
Goal funding pace at the new free cash level: ${goalLines}`

  return askAI('finance_scenario', context, `You are Vinay's personal finance advisor, giving a verdict on a hypothetical purchase using only the numbers given below. Never invent a number not provided.
Give a direct verdict (afford it / risky / don't) grounded in the actual before/after free cash figures and goal impact. Keep it under 150 words, no markdown.`)
}
