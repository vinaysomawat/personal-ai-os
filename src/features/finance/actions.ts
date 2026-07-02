'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function currentMonth() {
  return new Date().toISOString().slice(0, 7) // "YYYY-MM"
}

export async function getFinanceData() {
  const supabase = await createClient()
  const month = currentMonth()
  const startOfMonth = `${month}-01`

  const [expensesRes, budgetsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('*')
      .gte('date', startOfMonth)
      .order('date', { ascending: false }),
    supabase
      .from('budgets')
      .select('*')
      .eq('month', month),
  ])

  return {
    expenses: expensesRes.data ?? [],
    budgets: budgetsRes.data ?? [],
    month,
  }
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

  const { error } = await supabase.from('budgets').upsert({
    user_id: user.id,
    category,
    amount,
    month: currentMonth(),
  }, { onConflict: 'user_id,category,month' })

  if (error) throw new Error(error.message)
  revalidatePath('/finance')
}
