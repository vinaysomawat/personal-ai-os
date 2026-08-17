'use client'

import { useState, useEffect, useTransition } from 'react'
import { Sparkles, Pencil, Check, Eye, EyeOff, Repeat, Landmark, Target, Receipt } from 'lucide-react'
import Card from '@/components/Card'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { useAIAdvisor } from '@/components/AIAdvisorProvider'
import { todayIST } from '@/lib/date'
import {
  addExpense, deleteExpense, upsertBudget,
  upsertProfile, addLoan, deleteLoan, updateLoanTerms,
  addInvestment, updateInvestmentValue, updateInvestmentAmount, deleteInvestment,
  addGoal, updateGoalProgress, deleteGoal,
  addRecurringExpense, toggleRecurringExpense, deleteRecurringExpense,
} from '../actions'
import { askFinanceAdvisor } from '@/features/ai/finance-advisor'
import ScenarioSimulator from './ScenarioSimulator'
import SpendingHistory from './SpendingHistoryLazy'
import { CATEGORIES, INVESTMENT_TYPES } from '../types'
import type { Expense, Budget, FinanceProfile, Loan, Investment, FinancialGoal, RecurringExpense, InvestmentType, GoalPriority } from '../types'
import { useEscapeKey } from '@/lib/use-escape-key'
import { useFormValidation } from '@/lib/use-form-validation'
import FieldError from '@/components/FieldError'
import { logAdvisorUsage } from '@/lib/advisor-usage'

const CATEGORY_COLOR: Record<string, string> = {
  Food: 'bg-orange-500/15 text-orange-400', Transport: 'bg-blue-500/15 text-blue-400',
  Housing: 'bg-purple-500/15 text-purple-400', Health: 'bg-risk-soft text-red-400',
  Shopping: 'bg-pink-500/15 text-pink-400', Entertainment: 'bg-cyan-500/15 text-cyan-400',
  Learning: 'bg-good-soft text-green-400', Utilities: 'bg-warn-soft text-amber-400',
  EMIs: 'bg-risk-soft text-red-400', Bills: 'bg-indigo-500/15 text-indigo-400',
  Other: 'bg-surface-2 text-fg-secondary',
}

const PRIORITY_COLOR: Record<GoalPriority, string> = {
  high: 'text-red-400', medium: 'text-amber-400', low: 'text-fg-tertiary',
}

// Outlined mini "+ Add" trigger — design's style for Loans/Investments/Goals/
// Recurring section headers (distinct from By Category's filled "+ Add Expense").
const outlineAddBtn = 'px-2.5 py-1 rounded-[6px] border border-border-strong text-[11.5px] text-fg-secondary hover:bg-surface-2 transition-colors whitespace-nowrap'
// Design uses a plain "✕" glyph for every delete control in Finance (expenses,
// investments, recurring, loans) rather than a trash icon.
const deleteGlyphBtn = 'shrink-0 opacity-0 group-hover:opacity-100 text-fg-quaternary hover:text-red-400 text-[11px] p-0.5 transition-all'

const PENDING_DELETE_COPY: Record<'loan' | 'investment' | 'goal' | 'expense' | 'recurring', { title: string; description: (label: string) => string }> = {
  loan: { title: 'Delete loan?', description: label => `The loan "${label}" will be permanently removed.` },
  investment: { title: 'Delete investment?', description: label => `"${label}" will be permanently removed.` },
  goal: { title: 'Delete goal?', description: label => `The goal "${label}" will be permanently removed.` },
  expense: { title: 'Delete expense?', description: () => 'This expense will be permanently removed.' },
  recurring: { title: 'Delete recurring expense?', description: label => `"${label}" will no longer be auto-logged each month.` },
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
      <button onClick={() => { onSave(input); setEditing(false) }} aria-label="Save" className="p-1.5 -m-1.5 text-green-400"><Check size={12} /></button>
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
  salaryHistory: { amount: number; effective_date: string; note: string | null }[]
  avgMonthlyExpense: number
  expenseHistory: { amount: number; category: string; date: string }[]
  month: string
}

export default function FinanceView({ expenses, budgets, profile, loans, investments, goals, recurringExpenses, salaryHistory, avgMonthlyExpense, expenseHistory, month }: Props) {
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
  useEscapeKey(() => setModal(null))
  const { invalidFields, validate, clear, onFieldInput } = useFormValidation()
  useEffect(() => clear(), [modal, clear])
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'loan' | 'investment' | 'goal' | 'expense' | 'recurring'; id: string; label: string } | null>(null)

  // AI Advisor
  const [advisorTab, setAdvisorTab] = useState<'ask' | 'simulate'>('ask')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Derived numbers
  const salary = localProfile?.monthly_salary ?? 0
  // salary_history is already recorded on every salary change (see
  // upsertProfile) and fetched ascending by effective_date, so the last
  // entry is the most recent raise.
  const lastRaise = salaryHistory[salaryHistory.length - 1] ?? null
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
  }).filter(c => c.spent > 0 || c.budget > 0).sort((a, b) => b.spent - a.spent)

  // Design's over-budget banner names the single (first, by list order)
  // category that's over — not an aggregate "over budget overall" figure.
  const overBudgetCategory = byCategory.find(c => c.budget > 0 && c.spent > c.budget) ?? null

  const renderInvestmentItem = (inv: Investment) => {
    const gain = Number(inv.current_value) - Number(inv.invested_amount)
    return (
      <li key={inv.id} className="flex items-center gap-x-1.5 gap-y-1 flex-wrap text-[12.5px] text-fg-secondary group">
        <span>{inv.name} —</span>
        <span className="flex items-center gap-1">
          <InlineEdit value={String(inv.current_value)} prefix="₹" textSize="text-[12.5px]" inputWidth="w-24" onSave={v => handleInvValueSave(inv.id, v)} /> current,
        </span>
        <span className="flex items-center gap-1">
          <InlineEdit value={String(inv.invested_amount)} prefix="₹" textSize="text-[12.5px]" inputWidth="w-24" onSave={v => handleInvAmountSave(inv.id, v)} /> invested
        </span>
        <span className={gain >= 0 ? 'text-good' : 'text-risk'}>({gain >= 0 ? '+' : ''}₹{gain.toLocaleString('en-IN')})</span>
        <button onClick={() => setPendingDelete({ kind: 'investment', id: inv.id, label: inv.name })} aria-label="Delete investment" className={deleteGlyphBtn}>✕</button>
      </li>
    )
  }

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

  // Sets the amount to 0 rather than deleting the row — a real 0-amount row
  // for this month is what stops next month's carry-forward from
  // resurrecting an older nonzero budget for this category (see
  // getFinanceData's carry-forward logic).
  const handleBudgetRemove = (category: string) => {
    setLocalBudgets(prev => prev.map(b => b.category === category ? { ...b, amount: 0 } : b))
    startTransition(() => upsertBudget(category, 0))
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

  const confirmPendingDelete = () => {
    if (!pendingDelete) return
    const { kind, id } = pendingDelete
    if (kind === 'loan') handleDeleteLoan(id)
    else if (kind === 'investment') handleDeleteInvestment(id)
    else if (kind === 'goal') handleDeleteGoal(id)
    else if (kind === 'expense') handleDeleteExpense(id)
    else if (kind === 'recurring') handleDeleteRecurring(id)
    setPendingDelete(null)
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

  const advisorPortal = useAIAdvisor('Money Advisor', Sparkles, (
    <div className="space-y-3">
      <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
        <button onClick={() => { setAdvisorTab('ask'); logAdvisorUsage('Money Advisor', 'ask') }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${advisorTab === 'ask' ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>Ask</button>
        <button onClick={() => { setAdvisorTab('simulate'); logAdvisorUsage('Money Advisor', 'simulate') }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${advisorTab === 'simulate' ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>Simulate</button>
      </div>

      {advisorTab === 'ask' ? (
        <>
          <div className="flex gap-2 flex-wrap text-xs text-fg-quaternary">
            {['Can I afford a car?', 'Should I prepay my loan?', 'How much should I invest?', 'When can I retire?'].map(q => (
              <button key={q} onClick={() => setAiQuestion(q)} className="px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-fg-secondary transition-colors">{q}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder="Ask about your finances..."
              disabled={aiLoading}
              className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
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
          {aiAnswer && <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-3">{aiAnswer}</p>}
        </>
      ) : (
        <ScenarioSimulator profile={localProfile} goals={localGoals} avgMonthlyExpense={avgMonthlyExpense} />
      )}
    </div>
  ))

  return (
    <div className="space-y-3">
      {advisorPortal}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Finance</h1>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-accent">💰 Net Worth {fmt(netWorth)}</span>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">📊 3mo avg spend {fmt(avgMonthlyExpense)}</span>
      </div>

      {/* Over-budget alert — names the specific over-budget category, matching
          the design's exact message format, not just an aggregate figure. */}
      {overBudgetCategory && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-risk-soft border border-risk-border">
          <p className="text-[13px] text-risk-strong">⚠ {overBudgetCategory.cat} is over budget by {fmt(overBudgetCategory.spent - overBudgetCategory.budget)} this month.</p>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-fg-tertiary uppercase">Monthly Salary</p>
            <button onClick={() => setSalaryVisible(v => !v)} aria-label={salaryVisible ? 'Hide salary' : 'Show salary'} className="p-1.5 -m-1.5 text-fg-quaternary hover:text-fg-secondary transition-colors">
              {salaryVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <div className="text-xl font-bold text-fg-primary">
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
          {lastRaise && (
            <p className="text-[10.5px] text-fg-quaternary mt-1">
              Last raised {new Date(lastRaise.effective_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <p className="text-[11px] text-fg-tertiary uppercase mb-1">Portfolio</p>
          <p className="text-xl font-bold text-fg-primary">
            {fmt(portfolio)} <span className={`text-xs ${portfolio >= invested ? 'text-good' : 'text-risk'}`}>({portfolio >= invested ? '+' : '-'}{fmt(Math.abs(portfolio - invested))})</span>
          </p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <p className="text-[11px] text-fg-tertiary uppercase mb-1">Total Debt</p>
          <p className="text-xl font-bold text-risk">{fmt(totalDebt)}</p>
          <p className="text-[10.5px] text-fg-quaternary mt-1">{fmt(totalEMIs)}/mo EMI</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
          <p className="text-[11px] text-fg-tertiary uppercase mb-1">Net Worth</p>
          <p className={`text-xl font-bold ${netWorth >= 0 ? 'text-accent' : 'text-risk'}`}>{fmt(netWorth)}</p>
        </div>
      </div>

      {/* By Category (left) + Loans/Investments/Goals/Expenses stack (right) —
          matches the design's two-column grouping instead of stacking every
          section full-width. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <Card title="By Category" action={
          <button onClick={() => setModal('expense')} className="px-3.5 py-[7px] rounded-[7px] bg-accent text-white text-[12.5px] font-semibold hover:bg-accent/80 transition-colors whitespace-nowrap">
            + Add Expense
          </button>
        }>
          <div className="flex gap-3 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-risk">{fmt(totalSpent)}</p>
              <p className="text-xs text-fg-quaternary">Spent</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-fg-secondary">{fmt(totalBudget)}</p>
              <p className="text-xs text-fg-quaternary">Budget</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${remaining >= 0 ? 'text-good' : 'text-risk'}`}>{fmt(Math.abs(remaining))}</p>
              <p className="text-xs text-fg-quaternary">{remaining >= 0 ? 'Left' : 'Over'}</p>
            </div>
          </div>
          {byCategory.length === 0 ? (
            <EmptyState icon={Receipt} message="No expenses this month" compact />
          ) : (
            <ul className="space-y-2">
              {byCategory.map(({ cat, spent, budget }) => {
                const pctRaw = budget > 0 ? Math.round((spent / budget) * 100) : 0
                const pct = Math.min(100, pctRaw)
                // Design's spending-bar tier colors: green under 90%, amber
                // 90-99%, red at/over 100% — not the accent/red binary this
                // page used before.
                const tier = pctRaw >= 100 ? 'over' : pctRaw >= 90 ? 'near' : 'ok'
                const barColor = tier === 'over' ? 'bg-risk' : tier === 'near' ? 'bg-warn' : 'bg-good'
                const textColor = tier === 'over' ? 'text-risk' : tier === 'near' ? 'text-warn' : 'text-good'
                const badgeText = pctRaw > 100 ? 'Over' : pctRaw === 100 ? 'At limit' : pctRaw >= 90 ? 'Near limit' : null
                const catExpenses = localExpenses.filter(e => e.category === cat)
                const isOpen = expandedCategory === cat
                return (
                  <li key={cat}>
                    <div onClick={() => setExpandedCategory(isOpen ? null : cat)} className="cursor-pointer">
                      <div className="flex items-center justify-between mb-[5px] flex-wrap gap-1 text-[12.5px]">
                        <span className="flex items-center gap-1.5 text-fg-primary">
                          <span className={`inline-block transition-transform text-[10px] ${isOpen ? 'rotate-90' : ''}`}>▸</span>
                          {cat}
                          {badgeText && (
                            <span className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${tier === 'over' ? 'bg-risk-soft text-risk' : 'bg-warn-soft text-warn'}`}>{badgeText}</span>
                          )}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingBudget(cat); setBudgetInput(String(budget || '')) }}
                          className="flex items-center gap-1 text-fg-tertiary whitespace-nowrap group"
                        >
                          {budget > 0 ? <>{fmt(spent)} / {fmt(budget)} <span className={`font-semibold ${textColor}`}>({pctRaw}%)</span></> : fmt(spent)}
                          <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>
                      </div>
                      {budget > 0 && <div className="h-[6px] rounded-[4px] bg-border"><div className={`h-full rounded-[4px] ${barColor}`} style={{ width: `${pct}%` }} /></div>}
                    </div>
                    {editingBudget === cat && (
                      <div className="flex gap-2 mt-2">
                        <input value={budgetInput} onChange={e => setBudgetInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleBudgetSave(cat); if (e.key === 'Escape') setEditingBudget(null) }} placeholder="Budget amount" type="number" autoFocus className="flex-1 bg-surface-2 border border-accent rounded-lg px-3 py-1.5 text-sm text-fg-primary outline-none" />
                        <button onClick={() => handleBudgetSave(cat)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs">Save</button>
                        {budget > 0 && <button onClick={() => handleBudgetRemove(cat)} className="px-3 py-1.5 rounded-lg bg-surface-2 text-red-400 text-xs">Remove</button>}
                        <button onClick={() => setEditingBudget(null)} className="px-3 py-1.5 rounded-lg bg-surface-2 text-fg-secondary text-xs">Cancel</button>
                      </div>
                    )}
                    {isOpen && (
                      <ul className="mt-1.5 ml-1 pl-2 border-l border-surface-3 space-y-0.5">
                        {catExpenses.length === 0 ? (
                          <li className="text-xs text-fg-quaternary py-1">No expenses logged in this category</li>
                        ) : catExpenses.map(exp => (
                          <li key={exp.id} className="flex items-center gap-2 py-1 group">
                            <span className="text-xs text-fg-quaternary shrink-0">{exp.date}</span>
                            {exp.description && <span className="text-xs text-fg-tertiary truncate flex-1">{exp.description}</span>}
                            <span className="text-xs text-fg-secondary font-medium shrink-0 ml-auto">{fmt(Number(exp.amount))}</span>
                            <button onClick={() => setPendingDelete({ kind: 'expense', id: exp.id, label: exp.description || exp.category })} aria-label="Delete expense" className={deleteGlyphBtn}>✕</button>
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

        <div className="flex flex-col gap-3.5">
          <Card title="Loans" padding="p-[var(--card-pad-md)]" action={
            <button onClick={() => setModal('loan')} className={outlineAddBtn}>+ Add</button>
          }>
            {localLoans.length === 0 ? (
              <EmptyState icon={Landmark} message="No loans added" compact cta={{ label: 'Add loan', onClick: () => setModal('loan') }} />
            ) : (
              <ul className="flex flex-col gap-2">
                {localLoans.map(loan => (
                  <li key={loan.id} className="flex items-center gap-x-1.5 gap-y-1 flex-wrap text-[12.5px] text-fg-secondary group">
                    <span>{loan.name} — EMI</span>
                    <InlineEdit value={String(loan.emi)} prefix="₹" textSize="text-[12.5px]" inputWidth="w-20" onSave={v => handleLoanEmiSave(loan.id, v)} />
                    <span>·</span>
                    <InlineEdit value={loan.remaining_months !== null ? String(loan.remaining_months) : ''} prefix="" suffix=" months left" placeholder="?" textSize="text-[12.5px]" inputWidth="w-14" onSave={v => handleLoanMonthsSave(loan.id, v)} />
                    <span>·</span>
                    <InlineEdit value={loan.interest_rate !== null ? String(loan.interest_rate) : ''} prefix="" suffix="% p.a." placeholder="set rate" textSize="text-[12.5px]" inputWidth="w-14" onSave={v => handleLoanRateSave(loan.id, v)} />
                    <button onClick={() => setPendingDelete({ kind: 'loan', id: loan.id, label: loan.name })} aria-label="Delete loan" className={deleteGlyphBtn}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Investments" padding="p-[var(--card-pad-md)]" action={
            <button onClick={() => setModal('investment')} className={outlineAddBtn}>+ Add</button>
          }>
            {localInvestments.length === 0 ? (
              <EmptyState icon={Target} message="No investments added" compact cta={{ label: 'Add', onClick: () => setModal('investment') }} />
            ) : (
              <ul className="flex flex-col gap-2">{localInvestments.map(inv => renderInvestmentItem(inv))}</ul>
            )}
          </Card>

          <Card title="Financial Goals" padding="p-[var(--card-pad-md)]" action={
            <button onClick={() => setModal('goal')} className={outlineAddBtn}>+ Add</button>
          }>
            {localGoals.length === 0 ? (
              <EmptyState icon={Target} message="No goals set — add one to track your savings" compact cta={{ label: 'Add goal', onClick: () => setModal('goal') }} />
            ) : (
              <div className="flex flex-col gap-3">
                {localGoals.map(goal => {
                  const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
                  return (
                    <div key={goal.id} className="group">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[12.5px] text-fg-secondary font-medium">{goal.name}</p>
                            <span className={`text-xs font-medium ${PRIORITY_COLOR[goal.priority as GoalPriority]}`}>{goal.priority}</span>
                          </div>
                          {goal.target_date && <p className="text-xs text-fg-quaternary mt-0.5">Target: {goal.target_date}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          {editingGoalId === goal.id ? (
                            <div className="flex items-center gap-1">
                              <input value={editInput} onChange={e => setEditInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleGoalProgressSave(goal.id); if (e.key === 'Escape') setEditingGoalId(null) }} autoFocus className="w-24 bg-surface-2 border border-accent rounded px-2 py-0.5 text-xs outline-none" />
                              <button onClick={() => handleGoalProgressSave(goal.id)} aria-label="Save goal progress" className="p-1.5 -m-1.5 text-green-400"><Check size={10} /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingGoalId(goal.id); setEditInput(String(goal.current_amount)) }} className="text-xs text-fg-secondary hover:text-white flex items-center gap-1 group/g">
                              {fmt(Number(goal.current_amount))} / {fmt(Number(goal.target_amount))}
                              <Pencil size={8} className="opacity-0 group-hover/g:opacity-50 transition-opacity" />
                            </button>
                          )}
                          <button onClick={() => setPendingDelete({ kind: 'goal', id: goal.id, label: goal.name })} aria-label="Delete goal" className={deleteGlyphBtn}>✕</button>
                        </div>
                      </div>
                      <div className="h-[5px] rounded-[3px] bg-border">
                        <div className="h-full bg-accent rounded-[3px] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card title="Just Added" padding="p-[var(--card-pad-md)]" action={
            <button onClick={() => setModal('expense')} className={outlineAddBtn}>+ Add</button>
          }>
            {localExpenses.length === 0 ? (
              <EmptyState icon={Receipt} message="No expenses this month" compact cta={{ label: 'Add', onClick: () => setModal('expense') }} />
            ) : (
              <ul className="space-y-0.5 max-h-80 overflow-y-auto">
                {localExpenses.map(exp => (
                  <li key={exp.id} className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-surface-2 transition-colors group">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLOR[exp.category]}`}>{exp.category}</span>
                    <span className="text-xs text-fg-quaternary shrink-0">{exp.date}</span>
                    {exp.description && <span className="text-xs text-fg-secondary truncate flex-1">{exp.description}</span>}
                    <span className="text-xs text-fg-secondary font-medium shrink-0 ml-auto">{fmt(Number(exp.amount))}</span>
                    <button onClick={() => setPendingDelete({ kind: 'expense', id: exp.id, label: exp.description || exp.category })} aria-label="Delete expense" className={deleteGlyphBtn}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Recurring Expenses" action={
        <div className="flex items-center gap-3">
          {localRecurring.some(r => r.active) && (
            <span className="text-xs text-fg-tertiary">{fmt(localRecurring.filter(r => r.active).reduce((s, r) => s + Number(r.amount), 0))}/mo total</span>
          )}
          <button onClick={() => setModal('recurring')} className={outlineAddBtn}>+ Add</button>
        </div>
      }>
        <p className="text-xs text-fg-quaternary mb-3">Auto-logged into Expenses each month on its scheduled day — rent, subscriptions, and other fixed monthly costs you&apos;d otherwise have to re-enter by hand.</p>
        {localRecurring.length === 0 ? (
          <EmptyState icon={Repeat} message="No recurring expenses set up" compact cta={{ label: 'Add', onClick: () => setModal('recurring') }} />
        ) : (
          <ul className="flex flex-col gap-2">
            {localRecurring.map(r => (
              <li key={r.id} className="flex items-center gap-2 flex-wrap group">
                <span className={`text-[12.5px] ${r.active ? 'text-fg-secondary' : 'text-fg-quaternary line-through'}`}>
                  {r.name} — {fmt(Number(r.amount))} · day {r.day_of_month} of month · {r.category}
                </span>
                <button onClick={() => handleToggleRecurring(r.id, !r.active)} className="px-2 py-0.5 rounded-[6px] border border-border-strong text-[10.5px] text-fg-tertiary hover:text-fg-secondary transition-colors whitespace-nowrap">
                  {r.active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => setPendingDelete({ kind: 'recurring', id: r.id, label: r.name })} aria-label="Delete recurring expense" className={deleteGlyphBtn}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SpendingHistory expenseHistory={expenseHistory} currentMonth={month} />

      {/* Modals */}
      {modal && (
        <Modal
          title={modal === 'loan' ? 'Add Loan' : modal === 'investment' ? 'Add Investment' : modal === 'goal' ? 'Add Financial Goal' : modal === 'recurring' ? 'Add Recurring Expense' : 'Add Expense'}
          onClose={() => setModal(null)}
          maxWidthClass={modal === 'expense' ? 'max-w-[400px]' : undefined}
        >
            {modal === 'loan' && (
              <form className="flex flex-col gap-3.5" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
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
                <div>
                  <label className={modalLabelClass}>Name</label>
                  <input name="name" placeholder="e.g. Car Loan" required autoFocus className={modalInputClass(invalidFields.has('name'))} />
                  <FieldError show={invalidFields.has('name')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Principal (₹)</label>
                    <input name="principal" type="number" placeholder="2000000" required className={modalInputClass(invalidFields.has('principal'))} />
                    <FieldError show={invalidFields.has('principal')} />
                  </div>
                  <div>
                    <label className={modalLabelClass}>EMI (₹)</label>
                    <input name="emi" type="number" placeholder="15000" required className={modalInputClass(invalidFields.has('emi'))} />
                    <FieldError show={invalidFields.has('emi')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Interest Rate (%)</label>
                    <input name="rate" type="number" placeholder="8.5" className={modalInputClass()} />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Remaining Months</label>
                    <input name="months" type="number" placeholder="180" className={modalInputClass()} />
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 mt-1.5">
                  <button type="button" onClick={() => setModal(null)} className={modalCancelButtonClass}>Cancel</button>
                  <button type="submit" className={modalSaveButtonClass}>Save</button>
                </div>
              </form>
            )}

            {modal === 'investment' && (
              <form className="flex flex-col gap-3.5" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
                const fd = new FormData(e.currentTarget)
                const name = fd.get('name') as string
                const type = fd.get('type') as InvestmentType
                const invested = parseFloat(fd.get('invested') as string)
                const current = parseFloat(fd.get('current') as string)
                const notes = fd.get('notes') as string || null
                if (!name || !type || isNaN(invested)) return
                const newInv = {
                  id: `temp-${Date.now()}`, user_id: '', name, type, invested_amount: invested, current_value: current || invested, notes,
                  updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
                }
                setLocalInvestments(prev => [...prev, newInv])
                setModal(null)
                await addInvestment(name, type, invested, current || invested, notes)
              }}>
                <div>
                  <label className={modalLabelClass}>Name</label>
                  <input name="name" placeholder="e.g. Axis Bluechip" required autoFocus className={modalInputClass(invalidFields.has('name'))} />
                  <FieldError show={invalidFields.has('name')} />
                </div>
                <div>
                  <label className={modalLabelClass}>Type</label>
                  <select name="type" className={modalSelectClass}>
                    {INVESTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Invested Amount (₹)</label>
                    <input name="invested" type="number" placeholder="100000" required className={modalInputClass(invalidFields.has('invested'))} />
                    <FieldError show={invalidFields.has('invested')} />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Current Value (₹)</label>
                    <input name="current" type="number" placeholder="120000" className={modalInputClass()} />
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 mt-1.5">
                  <button type="button" onClick={() => setModal(null)} className={modalCancelButtonClass}>Cancel</button>
                  <button type="submit" className={modalSaveButtonClass}>Save</button>
                </div>
              </form>
            )}

            {modal === 'goal' && (
              <form className="flex flex-col gap-3.5" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
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
                <div>
                  <label className={modalLabelClass}>Name</label>
                  <input name="name" placeholder="e.g. New Setup" required autoFocus className={modalInputClass(invalidFields.has('name'))} />
                  <FieldError show={invalidFields.has('name')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Target Amount (₹)</label>
                    <input name="target" type="number" placeholder="300000" required className={modalInputClass(invalidFields.has('target'))} />
                    <FieldError show={invalidFields.has('target')} />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Current Amount (₹)</label>
                    <input name="current" type="number" placeholder="50000" className={modalInputClass()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Target Date</label>
                    <input name="date" type="date" className={modalInputClass()} />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Priority</label>
                    <select name="priority" className={modalSelectClass}>
                      <option value="high">High</option>
                      <option value="medium" selected>Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 mt-1.5">
                  <button type="button" onClick={() => setModal(null)} className={modalCancelButtonClass}>Cancel</button>
                  <button type="submit" className={modalSaveButtonClass}>Save</button>
                </div>
              </form>
            )}

            {modal === 'expense' && (
              <form className="flex flex-col gap-3.5" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
                const fd = new FormData(e.currentTarget)
                const newExp: Expense = {
                  id: `temp-${Date.now()}`, user_id: '',
                  amount: parseFloat(fd.get('amount') as string),
                  category: fd.get('category') as string,
                  description: fd.get('description') as string || null,
                  date: fd.get('date') as string || todayIST(),
                  created_at: new Date().toISOString(),
                }
                setLocalExpenses(prev => [newExp, ...prev])
                setModal(null)
                await addExpense(fd)
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Amount (₹)</label>
                    <input name="amount" type="number" required min="0" step="0.01" placeholder="500" autoFocus className={modalInputClass(invalidFields.has('amount'))} />
                    <FieldError show={invalidFields.has('amount')} message="Enter an amount before saving." />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Date</label>
                    <input name="date" type="date" defaultValue={todayIST()} className={modalInputClass()} />
                  </div>
                </div>
                <div>
                  <label className={modalLabelClass}>Category</label>
                  <select name="category" required className={modalSelectClass}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FieldError show={invalidFields.has('category')} />
                </div>
                <div>
                  <label className={modalLabelClass}>Description</label>
                  <input name="description" placeholder="Lunch, Uber, etc." className={modalInputClass()} />
                </div>
                <div className="flex justify-end gap-2.5 mt-1.5">
                  <button type="button" onClick={() => setModal(null)} className={modalCancelButtonClass}>Cancel</button>
                  <button type="submit" className={modalSaveButtonClass}>Add Expense</button>
                </div>
              </form>
            )}

            {modal === 'recurring' && (
              <form className="flex flex-col gap-3.5" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
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
                <div>
                  <label className={modalLabelClass}>Name</label>
                  <input name="name" required autoFocus placeholder="e.g. Rent" className={modalInputClass(invalidFields.has('name'))} />
                  <FieldError show={invalidFields.has('name')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={modalLabelClass}>Amount (₹)</label>
                    <input name="amount" type="number" required min="0" step="0.01" placeholder="15000" className={modalInputClass(invalidFields.has('amount'))} />
                    <FieldError show={invalidFields.has('amount')} />
                  </div>
                  <div>
                    <label className={modalLabelClass}>Day of Month</label>
                    <input name="day" type="number" required min="1" max="28" placeholder="1-28" className={modalInputClass(invalidFields.has('day'))} />
                    <FieldError show={invalidFields.has('day')} />
                  </div>
                </div>
                <div>
                  <label className={modalLabelClass}>Category</label>
                  <select name="category" required className={modalSelectClass}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <FieldError show={invalidFields.has('category')} />
                </div>
                <div className="flex justify-end gap-2.5 mt-1.5">
                  <button type="button" onClick={() => setModal(null)} className={modalCancelButtonClass}>Cancel</button>
                  <button type="submit" className={modalSaveButtonClass}>Save</button>
                </div>
              </form>
            )}
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={PENDING_DELETE_COPY[pendingDelete.kind].title}
          description={PENDING_DELETE_COPY[pendingDelete.kind].description(pendingDelete.label)}
          onConfirm={confirmPendingDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
