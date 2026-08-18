'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayIST, daysAgoIST } from '@/lib/date'
import { CATEGORIES } from './types'
import type { InvestmentType, GoalPriority } from './types'

function currentMonth() {
  return todayIST().slice(0, 7)
}

// "YYYY-MM" for n calendar months before the current month (n=0 is this
// month) — calendar-month arithmetic, not day-based, so it's exact
// regardless of how many days are in a given month.
function monthsAgoStr(n: number): string {
  const [y, m] = currentMonth().split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function getFinanceData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const month = currentMonth()
  const startOfMonth = `${month}-01`
  const threeMonthsAgo = daysAgoIST(90)
  const historyStart = `${monthsAgoStr(11)}-01`

  if (!user) return { expenses: [], budgets: [], profile: null, loans: [], investments: [], goals: [], recurringExpenses: [], salaryHistory: [], avgMonthlyExpense: 0, expenseHistory: [], month }

  const [expensesRes, budgetsRes, profileRes, loansRes, investmentsRes, goalsRes, recentExpensesRes, salaryHistoryRes, recurringRes, historyRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', startOfMonth).order('date', { ascending: false }),
    supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month),
    supabase.from('finance_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('loans').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('financial_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', threeMonthsAgo),
    supabase.from('salary_history').select('amount, effective_date, note').eq('user_id', user.id).order('effective_date', { ascending: true }),
    supabase.from('recurring_expenses').select('*').eq('user_id', user.id).order('day_of_month', { ascending: true }),
    supabase.from('expenses').select('amount, category, date').eq('user_id', user.id).gte('date', historyStart).order('date', { ascending: true }),
  ])

  const recentTotal = (recentExpensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const avgMonthlyExpense = Math.round(recentTotal / 3)

  // Carry forward last month's budget for any category that has none set
  // yet this month, so a new month never starts blank — the user only has
  // to touch a category again if the amount actually needs to change.
  // "Removing" a budget (see deleteBudget) sets it to 0 rather than
  // deleting the row, specifically so it stays carried-forward-as-0 instead
  // of resurrecting an older nonzero amount next month.
  let budgets = budgetsRes.data ?? []
  const budgetedCategories = new Set(budgets.map(b => b.category))
  const missingCategories = CATEGORIES.filter(c => !budgetedCategories.has(c))

  if (missingCategories.length > 0) {
    const { data: priorBudgets } = await supabase
      .from('budgets')
      .select('category, amount, month')
      .eq('user_id', user.id)
      .in('category', missingCategories)
      .lt('month', month)
      .order('month', { ascending: false })

    const seen = new Set<string>()
    const carryForwardRows = []
    for (const row of priorBudgets ?? []) {
      if (seen.has(row.category)) continue
      seen.add(row.category)
      carryForwardRows.push({ user_id: user.id, category: row.category, amount: row.amount, month })
    }

    if (carryForwardRows.length > 0) {
      const { data: inserted } = await supabase.from('budgets').upsert(carryForwardRows, { onConflict: 'user_id,category,month' }).select()
      budgets = [...budgets, ...(inserted ?? [])]
    }
  }

  return {
    expenses: expensesRes.data ?? [],
    budgets,
    profile: profileRes.data ?? null,
    loans: loansRes.data ?? [],
    investments: investmentsRes.data ?? [],
    goals: goalsRes.data ?? [],
    recurringExpenses: recurringRes.data ?? [],
    salaryHistory: (salaryHistoryRes.data ?? []) as { amount: number; effective_date: string; note: string | null }[],
    avgMonthlyExpense,
    expenseHistory: (historyRes.data ?? []) as { amount: number; category: string; date: string }[],
    month,
  }
}

interface CalendarDayPayment {
  name: string
  amount: number
  category: string
}

interface CalendarDayExpense {
  description: string | null
  category: string
  amount: number
}

export interface PaymentCalendarDay {
  date: string
  status: 'paid' | 'pending' | 'missed' | 'none'
  payments: CalendarDayPayment[]
  expenses: CalendarDayExpense[]
}

// Same shape/pattern as Coding's computeCodingCalendar and Learning's
// computeStudyCalendar, but the underlying question is different: not "was
// something logged today" for one activity stream, but "was every active
// recurring expense due on this day-of-month actually paid this month" — a
// day only has a status at all if it's some active template's due day
// (`day_of_month`), matched against a paid `expenses` row via the
// `recurring_expense_id` FK the recurring-expenses cron already sets
// (api/cron/recurring-expenses/route.ts). Matched by month, not exact date,
// since a template's actual paid date could shift a little in principle
// even though the cron currently always logs on the exact due day.
// `pending` (not yet due-or-not-due-yet vs. genuinely overdue) covers
// today-or-future unpaid due days; `missed` is strictly past and unpaid.
//
// `expenses` (added 2026-08-18, per user feedback that the calendar should
// "show the expenses done on each day") is separate from `payments`: every
// day's actual logged `expenses` rows, regardless of whether that day is a
// recurring due-date — so a day with real ad-hoc spend but no recurring
// template due is still clickable and shows what was spent. `status`/
// `payments` keep meaning "recurring bill on-time tracking" unchanged; the
// two lists are shown together in the calendar's detail panel, not merged.
export async function computePaymentCalendar(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, days = 182): Promise<PaymentCalendarDay[]> {
  const since = daysAgoIST(days)
  const [{ data: templates }, { data: paidExpenses }, { data: allExpenses }] = await Promise.all([
    supabase.from('recurring_expenses').select('id, name, amount, category, day_of_month').eq('user_id', userId).eq('active', true),
    supabase.from('expenses').select('date, recurring_expense_id').eq('user_id', userId).gte('date', since).not('recurring_expense_id', 'is', null),
    supabase.from('expenses').select('date, description, category, amount').eq('user_id', userId).gte('date', since),
  ])

  const activeTemplates = templates ?? []
  const paidMonths = new Set((paidExpenses ?? []).map(e => `${e.recurring_expense_id}:${e.date.slice(0, 7)}`))

  const expensesByDate = new Map<string, CalendarDayExpense[]>()
  for (const e of allExpenses ?? []) {
    const list = expensesByDate.get(e.date) ?? []
    list.push({ description: e.description, category: e.category, amount: Number(e.amount) })
    expensesByDate.set(e.date, list)
  }

  const today = todayIST()
  const result: PaymentCalendarDay[] = []
  for (let i = 0; i < days; i++) {
    const d = daysAgoIST(i)
    const dayOfMonth = Number(d.slice(8, 10))
    const monthKey = d.slice(0, 7)
    const dayExpenses = expensesByDate.get(d) ?? []
    const dueTemplates = activeTemplates.filter(t => t.day_of_month === dayOfMonth)
    if (dueTemplates.length === 0) {
      result.push({ date: d, status: 'none', payments: [], expenses: dayExpenses })
      continue
    }
    const payments = dueTemplates.map(t => ({ name: t.name, amount: t.amount, category: t.category }))
    const allPaid = dueTemplates.every(t => paidMonths.has(`${t.id}:${monthKey}`))
    const status: PaymentCalendarDay['status'] = allPaid ? 'paid' : (d >= today ? 'pending' : 'missed')
    result.push({ date: d, status, payments, expenses: dayExpenses })
  }
  return result.reverse()
}

export async function getFinanceCalendarData(days = 182): Promise<PaymentCalendarDay[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  return computePaymentCalendar(supabase, user.id, days)
}

export async function upsertProfile(salary: number | null, emergencyFundMonths: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Fetch previous salary to detect a change
  const { data: prev } = await supabase.from('finance_profile').select('monthly_salary').eq('user_id', user.id).single()

  await supabase.from('finance_profile').upsert(
    { user_id: user.id, monthly_salary: salary, emergency_fund_months: emergencyFundMonths, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  // Record salary change in history when value changes
  if (salary !== null && salary !== prev?.monthly_salary) {
    await supabase.from('salary_history').insert({
      user_id: user.id, amount: salary,
      effective_date: todayIST(),
    })
  }

  revalidatePath('/finance')
}

export async function addLoan(name: string, principal: number, emi: number, interestRate: number | null, remainingMonths: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('loans').insert({ user_id: user.id, name, principal, emi, interest_rate: interestRate, remaining_months: remainingMonths })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function deleteLoan(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

// Lets a rate change or a principal prepayment be reflected without deleting
// and re-adding the loan.
export async function updateLoanTerms(id: string, updates: { emi?: number; interestRate?: number | null; remainingMonths?: number | null }) {
  const supabase = await createClient()
  const patch: Record<string, number | null> = {}
  if (updates.emi !== undefined) patch.emi = updates.emi
  if (updates.interestRate !== undefined) patch.interest_rate = updates.interestRate
  if (updates.remainingMonths !== undefined) patch.remaining_months = updates.remainingMonths
  const { error } = await supabase.from('loans').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function addInvestment(
  name: string, type: InvestmentType, investedAmount: number, currentValue: number, notes: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('investments').insert({
    user_id: user.id, name, type, invested_amount: investedAmount, current_value: currentValue, notes,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function updateInvestmentValue(id: string, currentValue: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('investments').update({ current_value: currentValue, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function updateInvestmentAmount(id: string, investedAmount: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('investments').update({ invested_amount: investedAmount, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function deleteInvestment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function addGoal(name: string, targetAmount: number, currentAmount: number, targetDate: string | null, priority: GoalPriority) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('financial_goals').insert({ user_id: user.id, name, target_amount: targetAmount, current_amount: currentAmount, target_date: targetDate, priority })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function updateGoalProgress(id: string, currentAmount: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('financial_goals').update({ current_amount: currentAmount }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('financial_goals').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function addExpense(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount: parseFloat(formData.get('amount') as string),
    category: formData.get('category') as string,
    description: formData.get('description') as string || null,
    date: formData.get('date') as string || todayIST(),
  })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
  revalidatePath('/dashboard')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function upsertBudget(category: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('budgets').upsert({ user_id: user.id, category, amount, month: currentMonth() }, { onConflict: 'user_id,category,month' })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function addRecurringExpense(name: string, amount: number, category: string, dayOfMonth: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('recurring_expenses').insert({ user_id: user.id, name, amount, category, day_of_month: dayOfMonth })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function toggleRecurringExpense(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_expenses').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}
