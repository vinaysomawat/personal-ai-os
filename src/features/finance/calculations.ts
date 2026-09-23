// Pure finance math shared by the Finance page, the Money Advisor, the
// Finance Telegram bot, and the Risk Engine — one definition each, so every
// surface reports the same debt/pace numbers. Deterministic only (Product
// Principle 2).

// remaining_months is stored as a snapshot plus the month it was set
// (remaining_months_as_of); the live count is derived here at read time —
// minus one per calendar month since — rather than rewritten by a cron, so
// a missed job can't silently skip a month. Loads normalize loans through
// this once, so everything downstream just reads remaining_months.
export function loanEffectiveRemainingMonths(loan: { remaining_months: number | null; remaining_months_as_of: string | null }, today: string): number | null {
  if (loan.remaining_months === null || !loan.remaining_months_as_of) return loan.remaining_months
  const [ty, tm] = today.split('-').map(Number)
  const [ay, am] = loan.remaining_months_as_of.split('-').map(Number)
  const elapsed = Math.max(0, (ty - ay) * 12 + (tm - am))
  return Math.max(0, loan.remaining_months - elapsed)
}

// The as_of value to store alongside any write of remaining_months.
export function monthStart(today: string): string {
  return `${today.slice(0, 7)}-01`
}

interface LoanTerms {
  emi: number
  interest_rate: number | null
  remaining_months: number | null
}

// What's actually still owed today: the present value of the remaining EMIs
// at the loan's rate (standard amortization). emi × months would include
// every future interest payment too — for a 7.45% home loan with 105 months
// left that overstates the balance by ~35%. Falls back to emi × months when
// no rate is set, since there's nothing to discount by.
export function loanOutstanding(loan: LoanTerms): number {
  const emi = Number(loan.emi)
  const n = loan.remaining_months ?? 0
  if (n <= 0) return 0
  const rate = loan.interest_rate !== null ? Number(loan.interest_rate) : 0
  if (!rate) return emi * n
  const r = rate / 12 / 100
  return Math.round(emi * (1 - Math.pow(1 + r, -n)) / r)
}

// Every remaining EMI summed, interest included — the total cash still to
// go out, as opposed to loanOutstanding's balance owed today.
export function loanTotalPayable(loan: LoanTerms): number {
  return Number(loan.emi) * (loan.remaining_months ?? 0)
}

// Categories paid once a month in a lump (an EMI debit), not spread across
// days — extrapolating them per-day would project the day-1 EMI 30× over.
export const FIXED_MONTHLY_CATEGORIES: readonly string[] = ['EMIs']

export interface MonthPace {
  daysElapsed: number
  daysInMonth: number
  // Days still to spend in, today included.
  daysLeft: number
  spent: number
  projected: number
}

// Month-end projection: fixed categories count once as-is, everything else
// extrapolated at this month's per-day rate so far.
export function projectMonthSpend(expenses: { amount: number; category?: string | null }[], today: string): MonthPace {
  const [year, month, day] = today.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  let fixed = 0
  let variable = 0
  for (const e of expenses) {
    if (e.category && FIXED_MONTHLY_CATEGORIES.includes(e.category)) fixed += Number(e.amount)
    else variable += Number(e.amount)
  }
  return {
    daysElapsed: day,
    daysInMonth,
    daysLeft: daysInMonth - day + 1,
    spent: fixed + variable,
    projected: Math.round(fixed + (variable / day) * daysInMonth),
  }
}

// Per-category budget suggestion: average spend over the last 3 complete
// calendar months (the current partial month excluded), dividing only by
// months that have any expense at all — so a month before tracking began
// doesn't drag every average down. Rounded up to the nearest ₹500.
export function suggestBudgets(history: { amount: number; category: string; date: string }[], currentMonth: string): Record<string, number> {
  const [y, m] = currentMonth.split('-').map(Number)
  const window = [1, 2, 3].map(n => {
    const d = new Date(Date.UTC(y, m - 1 - n, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
  const activeMonths = new Set<string>()
  const totals: Record<string, number> = {}
  for (const e of history) {
    const month = e.date.slice(0, 7)
    if (!window.includes(month)) continue
    activeMonths.add(month)
    totals[e.category] = (totals[e.category] ?? 0) + Number(e.amount)
  }
  const divisor = Math.max(1, activeMonths.size)
  const result: Record<string, number> = {}
  for (const [cat, total] of Object.entries(totals)) {
    result[cat] = Math.ceil(total / divisor / 500) * 500
  }
  return result
}

// Calendar month the loan's last EMI falls in, counting remaining_months
// (already the effective, auto-decremented count — see
// loanEffectiveRemainingMonths) forward from the current month.
export function loanPayoffMonth(remainingMonths: number | null, today: string): string | null {
  if (!remainingMonths || remainingMonths <= 0) return null
  const [y, m] = today.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + remainingMonths - 1, 1))
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Monthly saving needed to close a goal's gap by its target date — whole
// calendar months left, counting the current one, min 1. null when there's
// no date or nothing left to save.
export function goalMonthlyNeeded(goal: { target_amount: number; current_amount: number; target_date: string | null }, today: string): number | null {
  const gap = Number(goal.target_amount) - Number(goal.current_amount)
  if (!goal.target_date || gap <= 0) return null
  const [ty, tm] = today.split('-').map(Number)
  const [gy, gm] = goal.target_date.split('-').map(Number)
  const months = Math.max(1, (gy - ty) * 12 + (gm - tm) + 1)
  return Math.ceil(gap / months)
}
