'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus, X, CalendarDays, HeartPulse, DollarSign } from 'lucide-react'
import { addTask } from '@/features/planner/actions'
import { addExpense } from '@/features/finance/actions'
import { todayIST } from '@/lib/date'
import { upsertTodayMetric } from '@/features/health/actions'
import { useEscapeKey } from '@/lib/use-escape-key'

type Mode = null | 'task' | 'expense' | 'metric'

const METRIC_OPTIONS = [
  { value: 'weight_kg',    label: 'Weight (kg)' },
  { value: 'sleep_hours',  label: 'Sleep (hours)' },
  { value: 'steps',        label: 'Steps' },
  { value: 'water_ml',     label: 'Water (ml)' },
  { value: 'calories',     label: 'Calories' },
  { value: 'protein_g',    label: 'Protein (g)' },
]

export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>(null)
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode) setTimeout(() => inputRef.current?.focus(), 50)
  }, [mode])

  const reset = () => { setOpen(false); setMode(null); setDone(false) }
  useEscapeKey(() => open && reset())

  const flash = () => { setDone(true); setTimeout(reset, 800) }

  const handleTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const text = fd.get('text') as string
    const priority = fd.get('priority') as 'high' | 'medium' | 'low'
    startTransition(async () => { await addTask(text, priority); flash() })
  }

  const handleExpense = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => { await addExpense(fd); flash() })
  }

  const handleMetric = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const field = fd.get('field') as string
    const value = parseFloat(fd.get('value') as string)
    if (!isNaN(value)) {
      startTransition(async () => { await upsertTodayMetric(field as Parameters<typeof upsertTodayMetric>[0], value); flash() })
    }
  }

  return (
    <>
      {/* Floating button — bottom-right, matching the design source's 52px/28px
          recipe exactly. Lifted above the fixed mobile bottom nav (58px) on
          small viewports so it doesn't sit on top of it. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="fixed bottom-[86px] md:bottom-7 right-7 z-[25] w-[52px] h-[52px] bg-accent rounded-full shadow-[0_8px_24px_var(--shadow-lg)] flex items-center justify-center hover:bg-accent/80 transition-colors">
        <Plus size={24} className="text-white" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-overlay flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-3">
              <p className="text-sm font-semibold text-fg-primary">
                {mode === 'task' ? 'Add Task' : mode === 'expense' ? 'Add Expense' : mode === 'metric' ? 'Log Metric' : 'Quick Add'}
              </p>
              <button onClick={reset} aria-label="Close" className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-secondary"><X size={16} /></button>
            </div>

            {!mode && (
              <div className="p-4 grid grid-cols-3 gap-2">
                {[
                  { key: 'task',    icon: CalendarDays, label: 'Task',    color: 'bg-blue-500/10 text-blue-400' },
                  { key: 'expense', icon: DollarSign,   label: 'Expense', color: 'bg-good-soft text-green-400' },
                  { key: 'metric',  icon: HeartPulse,   label: 'Metric',  color: 'bg-risk-soft text-red-400' },
                ].map(({ key, icon: Icon, label, color }) => (
                  <button key={key} onClick={() => setMode(key as Mode)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl ${color} hover:opacity-80 transition-opacity`}>
                    <Icon size={20} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {mode === 'task' && (
              <form onSubmit={handleTask} className="p-4 space-y-3">
                <input ref={inputRef} name="text" required placeholder="Task description..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
                <select name="priority" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-secondary outline-none focus:border-accent">
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                  <option value="low">Low priority</option>
                </select>
                <button type="submit" disabled={isPending || done} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-60 active:scale-95 transition-all">
                  {done ? '✓ Added!' : isPending ? 'Adding...' : 'Add Task'}
                </button>
              </form>
            )}

            {mode === 'expense' && (
              <form onSubmit={handleExpense} className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input ref={inputRef} name="amount" type="number" step="0.01" required placeholder="Amount ₹" className="bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
                  <select name="category" className="bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-secondary outline-none focus:border-accent">
                    {['Food','Transport','Shopping','Health','Entertainment','Bills','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input name="description" placeholder="Description (optional)" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
                <input name="date" type="date" defaultValue={todayIST()} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-secondary outline-none focus:border-accent transition-colors" />
                <button type="submit" disabled={isPending || done} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-60 active:scale-95 transition-all">
                  {done ? '✓ Logged!' : isPending ? 'Logging...' : 'Log Expense'}
                </button>
              </form>
            )}

            {mode === 'metric' && (
              <form onSubmit={handleMetric} className="p-4 space-y-3">
                <select name="field" autoFocus className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-secondary outline-none focus:border-accent transition-colors">
                  {METRIC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input name="value" type="number" step="any" required placeholder="Value" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
                <button type="submit" disabled={isPending || done} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-60 active:scale-95 transition-all">
                  {done ? '✓ Logged!' : isPending ? 'Logging...' : 'Log Metric'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
