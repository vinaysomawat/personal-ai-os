'use server'

import { aiText } from '@/lib/anthropic'
import type { FinanceProfile, Loan, Investment, FinancialGoal } from '@/features/finance/types'

interface FinancialContext {
  profile: FinanceProfile | null
  loans: Loan[]
  investments: Investment[]
  goals: FinancialGoal[]
  avgMonthlyExpense: number
}

export async function askFinanceAdvisor(question: string, ctx: FinancialContext): Promise<string> {
  const totalDebt = ctx.loans.reduce((s, l) => s + l.emi * (l.remaining_months ?? 0), 0)
  const totalEMIs = ctx.loans.reduce((s, l) => s + l.emi, 0)
  const portfolio = ctx.investments.reduce((s, i) => s + i.current_value, 0)
  const invested = ctx.investments.reduce((s, i) => s + i.invested_amount, 0)
  const salary = ctx.profile?.monthly_salary ?? 0
  const freeCash = salary - totalEMIs - ctx.avgMonthlyExpense

  const context = `Vinay's financial snapshot:
- Monthly salary: ₹${salary.toLocaleString('en-IN')}
- Monthly EMIs: ₹${totalEMIs.toLocaleString('en-IN')} (${ctx.loans.map(l => `${l.name}: ₹${l.emi.toLocaleString('en-IN')}/mo, ${l.remaining_months ?? '?'} months left`).join('; ') || 'none'})
- Avg monthly expenses: ₹${ctx.avgMonthlyExpense.toLocaleString('en-IN')}
- Free cash per month: ₹${freeCash.toLocaleString('en-IN')}
- Investment portfolio: ₹${portfolio.toLocaleString('en-IN')} (invested ₹${invested.toLocaleString('en-IN')}, P&L: ₹${(portfolio - invested).toLocaleString('en-IN')})
${ctx.investments.map(i => `  • ${i.name} (${i.type}): invested ₹${i.invested_amount.toLocaleString('en-IN')}, current ₹${i.current_value.toLocaleString('en-IN')}`).join('\n')}
- Total remaining debt: ₹${totalDebt.toLocaleString('en-IN')}
- Financial goals: ${ctx.goals.map(g => `${g.name} (target ₹${g.target_amount.toLocaleString('en-IN')}, saved ₹${g.current_amount.toLocaleString('en-IN')}${g.target_date ? `, by ${g.target_date}` : ''})`).join('; ') || 'none set'}
- Emergency fund target: ${ctx.profile?.emergency_fund_months ?? 6} months of expenses = ₹${((ctx.profile?.emergency_fund_months ?? 6) * ctx.avgMonthlyExpense).toLocaleString('en-IN')}

Question: ${question}`

  return aiText(context, `You are Vinay's personal finance advisor. Give sharp, specific, numbers-driven advice tailored to his exact situation.
Reference his actual salary, EMIs, and investments. Be direct — don't hedge everything.
If recommending an investment or loan decision, give a clear verdict with reasoning. Keep it under 200 words.`)
}
