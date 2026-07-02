'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import Card from '@/components/Card'
import { addExpense, deleteExpense, upsertBudget } from '../actions'
import { CATEGORIES } from '../types'
import type { Expense, Budget } from '../types'

const CATEGORY_COLOR: Record<string, string> = {
  Food: 'bg-orange-500/15 text-orange-400',
  Transport: 'bg-blue-500/15 text-blue-400',
  Housing: 'bg-purple-500/15 text-purple-400',
  Health: 'bg-red-500/15 text-red-400',
  Shopping: 'bg-pink-500/15 text-pink-400',
  Entertainment: 'bg-cyan-500/15 text-cyan-400',
  Learning: 'bg-green-500/15 text-green-400',
  Utilities: 'bg-amber-500/15 text-amber-400',
  Other: 'bg-slate-500/15 text-slate-400',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  initialExpenses: Expense[]
  initialBudgets: Budget[]
  month: string
}

export default function FinanceView({ initialExpenses, initialBudgets, month }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [isPending, startTransition] = useTransition()

  const [expenses, updateExpenses] = useOptimistic(
    initialExpenses,
    (state: Expense[], action: { type: string; payload: Partial<Expense> & { id?: string } }) => {
      if (action.type === 'add') return [action.payload as Expense, ...state]
      if (action.type === 'delete') return state.filter(e => e.id !== action.payload.id)
      return state
    }
  )

  const [budgets, updateBudgets] = useOptimistic(
    initialBudgets,
    (state: Budget[], action: { category: string; amount: number }) => {
      const exists = state.find(b => b.category === action.category)
      if (exists) return state.map(b => b.category === action.category ? { ...b, amount: action.amount } : b)
      return [...state, { id: `temp-${Date.now()}`, user_id: '', category: action.category, amount: action.amount, month }]
    }
  )

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const remaining = totalBudget - totalSpent

  const byCategory = CATEGORIES.map(cat => {
    const spent = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
    const budget = budgets.find(b => b.category === cat)?.amount ?? 0
    return { cat, spent, budget }
  }).filter(c => c.spent > 0 || c.budget > 0)

  const handleAdd = async (formData: FormData) => {
    const optimistic: Expense = {
      id: `temp-${Date.now()}`,
      user_id: '',
      amount: parseFloat(formData.get('amount') as string),
      category: formData.get('category') as string,
      description: formData.get('description') as string || null,
      date: formData.get('date') as string || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }
    setShowForm(false)
    startTransition(async () => {
      updateExpenses({ type: 'add', payload: optimistic })
      await addExpense(formData)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      updateExpenses({ type: 'delete', payload: { id } })
      await deleteExpense(id)
    })
  }

  const handleBudgetSave = (category: string) => {
    const amount = parseFloat(budgetInput)
    if (!amount || amount <= 0) { setEditingBudget(null); return }
    startTransition(async () => {
      updateBudgets({ category, amount })
      await upsertBudget(category, amount)
    })
    setEditingBudget(null)
    setBudgetInput('')
  }

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-xl font-bold text-red-400">{fmt(totalSpent)}</span>
          <span className="text-xs text-slate-500 mt-1">Spent</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-xl font-bold text-slate-400">{fmt(totalBudget)}</span>
          <span className="text-xs text-slate-500 mt-1">Budget</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className={`text-xl font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(Math.abs(remaining))}</span>
          <span className="text-xs text-slate-500 mt-1">{remaining >= 0 ? 'Remaining' : 'Over budget'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <Card title="By Category" action={<span className="text-xs text-slate-500">{monthLabel}</span>}>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">No expenses this month</p>
          ) : (
            <ul className="space-y-3">
              {byCategory.map(({ cat, spent, budget }) => {
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                const over = budget > 0 && spent > budget
                return (
                  <li key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[cat]}`}>{cat}</span>
                        <button
                          onClick={() => { setEditingBudget(cat); setBudgetInput(String(budget || '')) }}
                          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                        >
                          {budget > 0 ? `/ ${fmt(budget)}` : '+ budget'}
                        </button>
                      </div>
                      <span className={`text-sm font-medium ${over ? 'text-red-400' : 'text-slate-300'}`}>{fmt(spent)}</span>
                    </div>
                    {budget > 0 && (
                      <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-accent'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {editingBudget === cat && (
                      <div className="flex gap-2 mt-2">
                        <input
                          value={budgetInput}
                          onChange={e => setBudgetInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleBudgetSave(cat); if (e.key === 'Escape') setEditingBudget(null) }}
                          placeholder="Budget amount"
                          type="number"
                          autoFocus
                          className="flex-1 bg-surface-2 border border-accent rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none"
                        />
                        <button onClick={() => handleBudgetSave(cat)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs">Save</button>
                        <button onClick={() => setEditingBudget(null)} className="px-3 py-1.5 rounded-lg bg-surface-2 text-slate-400 text-xs">Cancel</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Expense list */}
        <Card title="Expenses" action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        }>
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">No expenses this month</p>
          ) : (
            <ul className="space-y-1.5 max-h-80 overflow-y-auto">
              {expenses.map(exp => (
                <li key={exp.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[exp.category]}`}>{exp.category}</span>
                      {exp.description && <span className="text-sm text-slate-400 truncate">{exp.description}</span>}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{exp.date}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-300 shrink-0">{fmt(Number(exp.amount))}</span>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Add expense modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">Add Expense</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form action={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Amount *</label>
                  <input name="amount" type="number" required min="0" step="0.01" placeholder="500" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Date</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Category *</label>
                <select name="category" required className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
                <input name="description" placeholder="Lunch, Uber, etc." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
