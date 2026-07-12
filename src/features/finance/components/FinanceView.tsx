'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, X, Sparkles, ChevronDown, Pencil, Check, TrendingUp, TrendingDown, Eye, EyeOff, Repeat } from 'lucide-react'
import Card from '@/components/Card'
import {
  addExpense, deleteExpense, upsertBudget,
  upsertProfile, addLoan, deleteLoan, updateLoanTerms,
  addInvestment, updateInvestmentValue, updateInvestmentAmount, deleteInvestment,
  addGoal, updateGoalProgress, deleteGoal,
  addRecurringExpense, toggleRecurringExpense, deleteRecurringExpense,
} from '../actions'
import { askFinanceAdvisor } from '@/features/ai/finance-advisor'
import { CATEGORIES, INVESTMENT_TYPES, INVESTMENT_COLOR } from '../types'
import type { Expense, Budget, FinanceProfile, Loan, Investment, FinancialGoal, RecurringExpense, InvestmentType, GoalPriority } from '../types'

const CATEGORY_COLOR: Record<string, string> = {
  Food: 'bg-orange-500/15 text-orange-400', Transport: 'bg-blue-500/15 text-blue-400',
  Housing: 'bg-purple-500/15 text-purple-400', Health: 'bg-red-500/15 text-red-400',
  Shopping: 'bg-pink-500/15 text-pink-400', Entertainment: 'bg-cyan-500/15 text-cyan-400',
  Learning: 'bg-green-500/15 text-green-400', Utilities: 'bg-amber-500/15 text-amber-400',
  EMIs: 'bg-red-500/15 text-red-400', Bills: 'bg-indigo-500/15 text-indigo-400',
  Other: 'bg-slate-500/15 text-slate-400',
}

const PRIORITY_COLOR: Record<GoalPriority, string> = {
  high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-500',
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function InlineEdit({ value, onSave, prefix = '₹', suffix = '', placeholder = '0', textSize = 'text-sm', inputWidth = 'w-32' }: {
  value: string; onSave: (v: string) => void; prefix?: string; suffix?: string; placeholder?: string; textSize?: string; inputWidth?: string
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value)

  if (!editing) return (
    <button onClick={() => { setInput(value); setEditing(true) }} className={`flex items-center gap-1 group ${textSize}`}>
      <span>{prefix}{value || placeholder}{suffix}</span>
      <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  )
  return (
    <div className="flex items-center gap-1">
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { onSave(input); setEditing(false) } if (e.key === 'Escape') setEditing(false) }} autoFocus className={`${inputWidth} bg-surface-2 border border-accent rounded px-2 py-0.5 ${textSize} outline-none`} />
      <button onClick={() => { onSave(input); setEditing(false) }} className="text-green-400"><Check size={12} /></button>
    </div>
  )
}

interface Props {
  expenses: Expense[]
  budgets: Budget[]
  profile: FinanceProfile | null
  loans: Loan[]
  investments: Investment[]
  goals: FinancialGoal[]
  recurringExpenses: RecurringExpense[]
  avgMonthlyExpense: number
  month: string
}

export default function FinanceView({ expenses, budgets, profile, loans, investments, goals, recurringExpenses, avgMonthlyExpense, month }: Props) {
  const [, startTransition] = useTransition()
  const [salaryVisible, setSalaryVisible] = useState(false)

  // Local state mirrors (optimistic)
  const [localProfile, setLocalProfile] = useState(profile)
  const [localLoans, setLocalLoans] = useState(loans)
  const [localInvestments, setLocalInvestments] = useState(investments)
  const [localGoals, setLocalGoals] = useState(goals)
  const [localExpenses, setLocalExpenses] = useState(expenses)
  const [localBudgets, setLocalBudgets] = useState(budgets)
  const [localRecurring, setLocalRecurring] = useState(recurringExpenses)

  // Modal state
  const [modal, setModal] = useState<'loan' | 'investment' | 'goal' | 'expense' | 'recurring' | null>(null)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // AI Advisor
  const [showAdvisor, setShowAdvisor] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Derived numbers
  const salary = localProfile?.monthly_salary ?? 0
  const totalEMIs = localLoans.reduce((s, l) => s + Number(l.emi), 0)
  const portfolio = localInvestments.reduce((s, i) => s + Number(i.current_value), 0)
  const invested = localInvestments.reduce((s, i) => s + Number(i.invested_amount), 0)
  const totalDebt = localLoans.reduce((s, l) => s + Number(l.emi) * (l.remaining_months ?? 0), 0)
  const netWorth = portfolio - totalDebt
  const totalSpent = localExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalBudget = localBudgets.reduce((s, b) => s + Number(b.amount), 0)
  // EMI is already counted here if it's been logged as an expense (as it
  // commonly is, e.g. a "Bills" entry) — don't also add loans.emi on top,
  // that double-counts it. loans.emi is informational (see "Total Debt"
  // above), not folded into spend.
  const remaining = totalBudget - totalSpent

  const byCategory = CATEGORIES.map(cat => {
    const spent = localExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
    const budget = localBudgets.find(b => b.category === cat)?.amount ?? 0
    return { cat, spent, budget }
  }).filter(c => c.spent > 0 || c.budget > 0)

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Handlers
  const handleSalary = (v: string) => {
    const n = parseFloat(v) || 0
    setLocalProfile(p => p ? { ...p, monthly_salary: n } : { id: '', user_id: '', monthly_salary: n, emergency_fund_months: 6, updated_at: new Date().toISOString() })
    startTransition(() => upsertProfile(n, localProfile?.emergency_fund_months ?? 6))
  }

  const handleDeleteLoan = (id: string) => {
    setLocalLoans(prev => prev.filter(l => l.id !== id))
    startTransition(() => deleteLoan(id))
  }

  const handleDeleteInvestment = (id: string) => {
    setLocalInvestments(prev => prev.filter(i => i.id !== id))
    startTransition(() => deleteInvestment(id))
  }

  const handleInvValueSave = (id: string, v: string) => {
    const n = parseFloat(v)
    if (isNaN(n)) return
    setLocalInvestments(prev => prev.map(i => i.id === id ? { ...i, current_value: n } : i))
    startTransition(() => updateInvestmentValue(id, n))
  }

  // SIP top-ups grow invested_amount each installment — edit in place instead
  // of deleting and re-adding the investment.
  const handleInvAmountSave = (id: string, v: string) => {
    const n = parseFloat(v)
    if (isNaN(n)) return
    setLocalInvestments(prev => prev.map(i => i.id === id ? { ...i, invested_amount: n } : i))
    startTransition(() => updateInvestmentAmount(id, n))
  }

  // A rate change or a principal prepayment shows up here without deleting
  // and re-adding the loan.
  const handleLoanEmiSave = (id: string, v: string) => {
    const n = parseFloat(v)
    if (isNaN(n)) return
    setLocalLoans(prev => prev.map(l => l.id === id ? { ...l, emi: n } : l))
    startTransition(() => updateLoanTerms(id, { emi: n }))
  }

  const handleLoanRateSave = (id: string, v: string) => {
    const n = v.trim() === '' ? null : parseFloat(v)
    if (n !== null && isNaN(n)) return
    setLocalLoans(prev => prev.map(l => l.id === id ? { ...l, interest_rate: n } : l))
    startTransition(() => updateLoanTerms(id, { interestRate: n }))
  }

  const handleLoanMonthsSave = (id: string, v: string) => {
    const n = v.trim() === '' ? null : parseInt(v, 10)
    if (n !== null && isNaN(n)) return
    setLocalLoans(prev => prev.map(l => l.id === id ? { ...l, remaining_months: n } : l))
    startTransition(() => updateLoanTerms(id, { remainingMonths: n }))
  }

  const handleGoalProgressSave = (id: string) => {
    const v = parseFloat(editInput)
    if (!isNaN(v)) {
      setLocalGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount: v } : g))
      startTransition(() => updateGoalProgress(id, v))
    }
    setEditingGoalId(null)
  }

  const handleDeleteGoal = (id: string) => {
    setLocalGoals(prev => prev.filter(g => g.id !== id))
    startTransition(() => deleteGoal(id))
  }

  const handleBudgetSave = (category: string) => {
    const amount = parseFloat(budgetInput)
    if (!amount || amount <= 0) { setEditingBudget(null); return }
    setLocalBudgets(prev => {
      const exists = prev.find(b => b.category === category)
      if (exists) return prev.map(b => b.category === category ? { ...b, amount } : b)
      return [...prev, { id: `temp-${Date.now()}`, user_id: '', category, amount, month }]
    })
    startTransition(() => upsertBudget(category, amount))
    setEditingBudget(null); setBudgetInput('')
  }

  const handleDeleteExpense = (id: string) => {
    setLocalExpenses(prev => prev.filter(e => e.id !== id))
    startTransition(() => deleteExpense(id))
  }

  const handleToggleRecurring = (id: string, active: boolean) => {
    setLocalRecurring(prev => prev.map(r => r.id === id ? { ...r, active } : r))
    startTransition(() => toggleRecurringExpense(id, active))
  }

  const handleDeleteRecurring = (id: string) => {
    setLocalRecurring(prev => prev.filter(r => r.id !== id))
    startTransition(() => deleteRecurringExpense(id))
  }

  const handleAsk = async () => {
    if (!aiQuestion.trim() || aiLoading) return
    setAiLoading(true)
    setAiAnswer(null)
    try {
      const answer = await askFinanceAdvisor(aiQuestion, {
        profile: localProfile, loans: localLoans, investments: localInvestments,
        goals: localGoals, avgMonthlyExpense,
      })
      setAiAnswer(answer)
    } finally { setAiLoading(false) }
  }

  return (
    <div className="space-y-5">
      {/* AI Finance Advisor */}
      <div className="border border-surface-3 rounded-xl overflow-hidden">
        <button onClick={() => setShowAdvisor(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-sm font-medium text-slate-300">AI Finance Advisor</span>
            <span className="text-xs text-slate-600">Ask anything about your money</span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${showAdvisor ? 'rotate-180' : ''}`} />
        </button>
        {showAdvisor && (
          <div className="px-4 py-4 bg-surface-1 border-t border-surface-3 space-y-3">
            <div className="flex gap-2 flex-wrap text-xs text-slate-600">
              {['Can I afford a car?', 'Should I prepay my loan?', 'How much should I invest?', 'When can I retire?'].map(q => (
                <button key={q} onClick={() => setAiQuestion(q)} className="px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-slate-400 transition-colors">{q}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={aiQuestion}
                onChange={e => setAiQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="Ask about your finances..."
                className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
              />
              <button onClick={handleAsk} disabled={aiLoading || !aiQuestion.trim()} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
                {aiLoading ? '...' : 'Ask'}
              </button>
            </div>
            {aiLoading && (
              <div className="space-y-2">
                {[90, 75, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
              </div>
            )}
            {aiAnswer && <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-3">{aiAnswer}</p>}
          </div>
        )}
      </div>

      {/* Net Worth Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Monthly Salary</p>
            <button onClick={() => setSalaryVisible(v => !v)} className="text-slate-600 hover:text-slate-400 transition-colors">
              {salaryVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <div className="text-xl font-bold text-slate-200">
            {salaryVisible ? (
              <InlineEdit
                value={salary ? Math.round(salary).toString() : ''}
                placeholder="Set salary"
                onSave={handleSalary}
              />
            ) : (
              <span className="tracking-widest">••••••</span>
            )}
          </div>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Portfolio</p>
          <p className="text-xl font-bold text-green-400">{fmt(portfolio)}</p>
          <p className={`text-xs mt-1 ${portfolio >= invested ? 'text-green-500' : 'text-red-400'}`}>
            {portfolio >= invested ? <TrendingUp size={10} className="inline mr-1" /> : <TrendingDown size={10} className="inline mr-1" />}
            {fmt(Math.abs(portfolio - invested))} {portfolio >= invested ? 'gain' : 'loss'}
          </p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Debt</p>
          <p className="text-xl font-bold text-red-400">{fmt(totalDebt)}</p>
          <p className="text-xs text-slate-600 mt-1">{fmt(totalEMIs)}/mo EMI</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Net Worth</p>
          <p className={`text-xl font-bold ${netWorth >= 0 ? 'text-accent' : 'text-red-400'}`}>{fmt(netWorth)}</p>
        </div>
      </div>

      {/* Loans + Investments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Loans & EMIs" action={
          <button onClick={() => setModal('loan')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add loan
          </button>
        }>
          {localLoans.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">No loans added</p>
          ) : (
            <ul className="space-y-3">
              {localLoans.map(loan => {
                const totalMonths = loan.remaining_months ?? 0
                const remaining = totalMonths > 0 ? loan.emi * totalMonths : loan.principal
                return (
                  <li key={loan.id} className="group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-300 font-medium">{loan.name}</p>
                        <div className="text-xs text-slate-600 mt-0.5 flex items-center flex-wrap gap-x-1">
                          <InlineEdit
                            value={String(loan.emi)} prefix="₹" suffix="/mo" textSize="text-xs" inputWidth="w-20"
                            onSave={v => handleLoanEmiSave(loan.id, v)}
                          />
                          <span>·</span>
                          <InlineEdit
                            value={loan.remaining_months !== null ? String(loan.remaining_months) : ''} prefix="" suffix=" months left" placeholder="?" textSize="text-xs" inputWidth="w-14"
                            onSave={v => handleLoanMonthsSave(loan.id, v)}
                          />
                          <span>·</span>
                          <InlineEdit
                            value={loan.interest_rate !== null ? String(loan.interest_rate) : ''} prefix="" suffix="% p.a." placeholder="set rate" textSize="text-xs" inputWidth="w-14"
                            onSave={v => handleLoanRateSave(loan.id, v)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-red-400">{fmt(remaining)}</span>
                        <button onClick={() => handleDeleteLoan(loan.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {loan.remaining_months && (
                      <div className="mt-2 h-1 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400/60 rounded-full" style={{ width: '30%' }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Investments" action={
          <button onClick={() => setModal('investment')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add
          </button>
        }>
          {localInvestments.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">No investments added</p>
          ) : (
            <ul className="space-y-3">
              {localInvestments.map(inv => {
                const pl = Number(inv.current_value) - Number(inv.invested_amount)
                const plPct = Number(inv.invested_amount) > 0 ? (pl / Number(inv.invested_amount)) * 100 : 0
                return (
                  <li key={inv.id} className="group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${INVESTMENT_COLOR[inv.type as InvestmentType]}`}>
                            {INVESTMENT_TYPES.find(t => t.value === inv.type)?.label ?? inv.type}
                          </span>
                          <p className="text-sm text-slate-300 truncate">{inv.name}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-slate-600 flex items-center gap-1">
                            invested
                            <InlineEdit
                              value={String(inv.invested_amount)} prefix="₹" textSize="text-xs" inputWidth="w-24"
                              onSave={v => handleInvAmountSave(inv.id, v)}
                            />
                          </span>
                          <span className="text-slate-300 font-medium flex items-center gap-1">
                            current
                            <InlineEdit
                              value={String(inv.current_value)} prefix="₹" textSize="text-xs" inputWidth="w-24"
                              onSave={v => handleInvValueSave(inv.id, v)}
                            />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pl >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                        </span>
                        <button onClick={() => handleDeleteInvestment(inv.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Goals */}
      <Card title="Financial Goals" action={
        <button onClick={() => setModal('goal')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add goal
        </button>
      }>
        {localGoals.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No goals set — add one to track your savings</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {localGoals.map(goal => {
              const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
              return (
                <div key={goal.id} className="group">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-300 font-medium">{goal.name}</p>
                        <span className={`text-xs font-medium ${PRIORITY_COLOR[goal.priority as GoalPriority]}`}>{goal.priority}</span>
                      </div>
                      {goal.target_date && <p className="text-xs text-slate-600 mt-0.5">Target: {goal.target_date}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingGoalId === goal.id ? (
                        <div className="flex items-center gap-1">
                          <input value={editInput} onChange={e => setEditInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleGoalProgressSave(goal.id); if (e.key === 'Escape') setEditingGoalId(null) }} autoFocus className="w-24 bg-surface-2 border border-accent rounded px-2 py-0.5 text-xs outline-none" />
                          <button onClick={() => handleGoalProgressSave(goal.id)} className="text-green-400"><Check size={10} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingGoalId(goal.id); setEditInput(String(goal.current_amount)) }} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 group/g">
                          {fmt(Number(goal.current_amount))} / {fmt(Number(goal.target_amount))}
                          <Pencil size={8} className="opacity-0 group-hover/g:opacity-50 transition-opacity" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{pct.toFixed(0)}% · {fmt(Number(goal.target_amount) - Number(goal.current_amount))} to go</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Expenses + Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <Card title="By Category" padding="p-3.5" action={<span className="text-xs text-slate-500">{monthLabel}</span>}>
          <div className="flex gap-3 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">{fmt(totalSpent)}</p>
              <p className="text-xs text-slate-600">Spent</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-400">{fmt(totalBudget)}</p>
              <p className="text-xs text-slate-600">Budget</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(Math.abs(remaining))}</p>
              <p className="text-xs text-slate-600">{remaining >= 0 ? 'Left' : 'Over'}</p>
            </div>
          </div>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">No expenses this month</p>
          ) : (
            <ul className="space-y-2">
              {byCategory.map(({ cat, spent, budget }) => {
                const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                const over = budget > 0 && spent > budget
                const catExpenses = localExpenses.filter(e => e.category === cat)
                const isOpen = expandedCategory === cat
                return (
                  <li key={cat}>
                    <div onClick={() => setExpandedCategory(isOpen ? null : cat)} className="cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[cat]}`}>{cat}</span>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingBudget(cat); setBudgetInput(String(budget || '')) }}
                            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            {budget > 0 ? `/ ${fmt(budget)}` : '+ budget'}
                          </button>
                        </div>
                        <span className={`text-sm font-medium ${over ? 'text-red-400' : 'text-slate-300'}`}>{fmt(spent)}</span>
                      </div>
                      {budget > 0 && <div className="h-1 bg-surface-3 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-accent'}`} style={{ width: `${pct}%` }} /></div>}
                    </div>
                    {editingBudget === cat && (
                      <div className="flex gap-2 mt-2">
                        <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleBudgetSave(cat); if (e.key === 'Escape') setEditingBudget(null) }} placeholder="Budget amount" type="number" autoFocus className="flex-1 bg-surface-2 border border-accent rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none" />
                        <button onClick={() => handleBudgetSave(cat)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs">Save</button>
                        <button onClick={() => setEditingBudget(null)} className="px-3 py-1.5 rounded-lg bg-surface-2 text-slate-400 text-xs">Cancel</button>
                      </div>
                    )}
                    {isOpen && (
                      <ul className="mt-1.5 ml-1 pl-2 border-l border-surface-3 space-y-0.5">
                        {catExpenses.length === 0 ? (
                          <li className="text-xs text-slate-600 py-1">No expenses logged in this category</li>
                        ) : catExpenses.map(exp => (
                          <li key={exp.id} className="flex items-center gap-2 py-1 group">
                            <span className="text-xs text-slate-600 shrink-0">{exp.date}</span>
                            {exp.description && <span className="text-xs text-slate-500 truncate flex-1">{exp.description}</span>}
                            <span className="text-xs text-slate-300 font-medium shrink-0 ml-auto">{fmt(Number(exp.amount))}</span>
                            <button onClick={() => handleDeleteExpense(exp.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"><Trash2 size={11} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Expense list */}
        <Card title="Expenses" padding="p-3.5" action={
          <button onClick={() => setModal('expense')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add
          </button>
        }>
          {localExpenses.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">No expenses this month</p>
          ) : (
            <ul className="space-y-1 max-h-80 overflow-y-auto">
              {localExpenses.map(exp => (
                <li key={exp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[exp.category]}`}>{exp.category}</span>
                      {exp.description && <span className="text-sm text-slate-400 truncate">{exp.description}</span>}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{exp.date}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-300 shrink-0">{fmt(Number(exp.amount))}</span>
                  <button onClick={() => handleDeleteExpense(exp.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recurring Expenses" action={
        <button onClick={() => setModal('recurring')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        <p className="text-xs text-slate-600 mb-3">Auto-logged into Expenses each month on its scheduled day — rent, subscriptions, and other fixed monthly costs you'd otherwise have to re-enter by hand.</p>
        {localRecurring.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No recurring expenses set up</p>
        ) : (
          <ul className="space-y-1.5">
            {localRecurring.map(r => (
              <li key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group ${!r.active ? 'opacity-50' : ''}`}>
                <Repeat size={14} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[r.category] ?? CATEGORY_COLOR.Other}`}>{r.category}</span>
                    <span className="text-sm text-slate-300 truncate">{r.name}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">Day {r.day_of_month} of every month</p>
                </div>
                <span className="text-sm font-medium text-slate-300 shrink-0">{fmt(Number(r.amount))}</span>
                <button onClick={() => handleToggleRecurring(r.id, !r.active)} className="shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  {r.active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => handleDeleteRecurring(r.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">
                {modal === 'loan' ? 'Add Loan' : modal === 'investment' ? 'Add Investment' : modal === 'goal' ? 'Add Goal' : modal === 'recurring' ? 'Add Recurring Expense' : 'Add Expense'}
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>

            {modal === 'loan' && (
              <form className="space-y-3" onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const name = fd.get('name') as string
                const principal = parseFloat(fd.get('principal') as string)
                const emi = parseFloat(fd.get('emi') as string)
                const rate = parseFloat(fd.get('rate') as string) || null
                const months = parseInt(fd.get('months') as string) || null
                if (!name || !principal || !emi) return
                const newLoan = { id: `temp-${Date.now()}`, user_id: '', name, principal, emi, interest_rate: rate, remaining_months: months, created_at: new Date().toISOString() }
                setLocalLoans(prev => [...prev, newLoan])
                setModal(null)
                await addLoan(name, principal, emi, rate, months)
              }}>
                {[['name', 'Loan name', 'text', 'Home Loan', true], ['principal', 'Principal amount (₹)', 'number', '2000000', true], ['emi', 'Monthly EMI (₹)', 'number', '15000', true], ['rate', 'Interest rate (% p.a.)', 'number', '8.5', false], ['months', 'Remaining months', 'number', '180', false]].map(([name, label, type, placeholder, required]) => (
                  <div key={name as string} className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">{label as string}{!required && ' (optional)'}</label>
                    <input name={name as string} type={type as string} placeholder={placeholder as string} required={required as boolean} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add Loan</button>
                </div>
              </form>
            )}

            {modal === 'investment' && (
              <form className="space-y-3" onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const name = fd.get('name') as string
                const type = fd.get('type') as InvestmentType
                const invested = parseFloat(fd.get('invested') as string)
                const current = parseFloat(fd.get('current') as string)
                const notes = fd.get('notes') as string || null
                if (!name || !type || isNaN(invested)) return
                const newInv = { id: `temp-${Date.now()}`, user_id: '', name, type, invested_amount: invested, current_value: current || invested, notes, updated_at: new Date().toISOString(), created_at: new Date().toISOString() }
                setLocalInvestments(prev => [...prev, newInv])
                setModal(null)
                await addInvestment(name, type, invested, current || invested, notes)
              }}>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Name</label>
                  <input name="name" placeholder="Axis Bluechip Fund" required className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Type</label>
                  <select name="type" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {INVESTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Invested (₹)</label>
                    <input name="invested" type="number" placeholder="100000" required className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Current value (₹)</label>
                    <input name="current" type="number" placeholder="120000" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add</button>
                </div>
              </form>
            )}

            {modal === 'goal' && (
              <form className="space-y-3" onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const name = fd.get('name') as string
                const target = parseFloat(fd.get('target') as string)
                const current = parseFloat(fd.get('current') as string) || 0
                const date = fd.get('date') as string || null
                const priority = fd.get('priority') as GoalPriority
                if (!name || isNaN(target)) return
                const newGoal = { id: `temp-${Date.now()}`, user_id: '', name, target_amount: target, current_amount: current, target_date: date, priority, created_at: new Date().toISOString() }
                setLocalGoals(prev => [...prev, newGoal])
                setModal(null)
                await addGoal(name, target, current, date, priority)
              }}>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Goal name</label>
                  <input name="name" placeholder="Emergency Fund" required className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Target (₹)</label>
                    <input name="target" type="number" placeholder="300000" required className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Saved so far (₹)</label>
                    <input name="current" type="number" placeholder="50000" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Target date (optional)</label>
                    <input name="date" type="date" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Priority</label>
                    <select name="priority" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                      <option value="high">High</option>
                      <option value="medium" selected>Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add Goal</button>
                </div>
              </form>
            )}

            {modal === 'expense' && (
              <form className="space-y-3" onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const newExp: Expense = {
                  id: `temp-${Date.now()}`, user_id: '',
                  amount: parseFloat(fd.get('amount') as string),
                  category: fd.get('category') as string,
                  description: fd.get('description') as string || null,
                  date: fd.get('date') as string || new Date().toISOString().split('T')[0],
                  created_at: new Date().toISOString(),
                }
                setLocalExpenses(prev => [newExp, ...prev])
                setModal(null)
                await addExpense(fd)
              }}>
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
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add</button>
                </div>
              </form>
            )}

            {modal === 'recurring' && (
              <form className="space-y-3" onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const name = fd.get('name') as string
                const amount = parseFloat(fd.get('amount') as string)
                const category = fd.get('category') as string
                const dayOfMonth = parseInt(fd.get('day') as string, 10)
                if (!name || !amount || !dayOfMonth) return
                const newRec: RecurringExpense = {
                  id: `temp-${Date.now()}`, user_id: '', name, amount, category, day_of_month: dayOfMonth, active: true, created_at: new Date().toISOString(),
                }
                setLocalRecurring(prev => [...prev, newRec])
                setModal(null)
                await addRecurringExpense(name, amount, category, dayOfMonth)
              }}>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Name *</label>
                  <input name="name" required autoFocus placeholder="Rent" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Amount *</label>
                    <input name="amount" type="number" required min="0" step="0.01" placeholder="15000" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Day of month *</label>
                    <input name="day" type="number" required min="1" max="28" placeholder="1" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Category *</label>
                  <select name="category" required className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
