'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { InvestmentType, GoalPriority } from './types'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export async function getFinanceData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const month = currentMonth()
  const startOfMonth = `${month}-01`
  const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

  if (!user) return { expenses: [], budgets: [], profile: null, loans: [], investments: [], goals: [], avgMonthlyExpense: 0, month }

  const [expensesRes, budgetsRes, profileRes, loansRes, investmentsRes, goalsRes, recentExpensesRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', user.id).gte('date', startOfMonth).order('date', { ascending: false }),
    supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month),
    supabase.from('finance_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('loans').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('financial_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('expenses').select('amount').eq('user_id', user.id).gte('date', threeMonthsAgo),
  ])

  const recentTotal = (recentExpensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const avgMonthlyExpense = Math.round(recentTotal / 3)

  return {
    expenses: expensesRes.data ?? [],
    budgets: budgetsRes.data ?? [],
    profile: profileRes.data ?? null,
    loans: loansRes.data ?? [],
    investments: investmentsRes.data ?? [],
    goals: goalsRes.data ?? [],
    avgMonthlyExpense,
    month,
  }
}

export async function upsertProfile(salary: number | null, emergencyFundMonths: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('finance_profile').upsert(
    { user_id: user.id, monthly_salary: salary, emergency_fund_months: emergencyFundMonths, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
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

export async function addInvestment(name: string, type: InvestmentType, investedAmount: number, currentValue: number, notes: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('investments').insert({ user_id: user.id, name, type, invested_amount: investedAmount, current_value: currentValue, notes })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}

export async function updateInvestmentValue(id: string, currentValue: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('investments').update({ current_value: currentValue, updated_at: new Date().toISOString() }).eq('id', id)
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
    date: formData.get('date') as string || new Date().toISOString().split('T')[0],
  })
  if (error) throw new Error(error.message)
  revalidatePath('/finance')
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
