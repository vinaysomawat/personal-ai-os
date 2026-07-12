'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, Bell, LogOut, Sparkles, Download } from 'lucide-react'
import Card from '@/components/Card'
import { signout } from '@/app/login/actions'
import { addReminder, deleteReminder, exportAllData } from '../actions'
import { REMINDER_MODULES } from '../types'
import type { Reminder, ReminderSlot } from '../types'

const MODULE_LABEL: Record<string, string> = {
  planner: 'Planner', career: 'Career', finance: 'Finance', health: 'Health',
  learning: 'Learning', coding: 'Coding', documents: 'Documents',
}

function fmtUsd(n: number): string {
  if (n === 0) return '0.00'
  if (n < 0.01) return n.toFixed(4)
  return n.toFixed(2)
}

interface Props {
  email: string | null
  initialReminders: Reminder[]
  aiBudget: { dailyBudget: number; monthlyBudget: number; spentToday: number; spentThisMonth: number }
}

export default function SettingsView({ email, initialReminders, aiBudget }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [slot, setSlot] = useState<ReminderSlot>('morning')
  const [module, setModule] = useState('planner')
  const [, startTransition] = useTransition()

  const [reminders, updateReminders] = useOptimistic(
    initialReminders,
    (state: Reminder[], action: { type: 'add' | 'delete'; payload: Reminder | { id: string } }) => {
      if (action.type === 'add') return [action.payload as Reminder, ...state]
      if (action.type === 'delete') return state.filter(r => r.id !== (action.payload as { id: string }).id)
      return state
    }
  )

  const handleAdd = () => {
    if (!label.trim()) return
    const text = label.trim()
    const optimistic: Reminder = {
      id: `temp-${Date.now()}`, user_id: '', module, label: text, slot, active: true, created_at: new Date().toISOString(),
    }
    setLabel('')
    setShowForm(false)
    startTransition(async () => {
      updateReminders({ type: 'add', payload: optimistic })
      await addReminder(text, slot, module)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      updateReminders({ type: 'delete', payload: { id } })
      await deleteReminder(id)
    })
  }

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vinay-ai-os-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const dailyPct = aiBudget.dailyBudget > 0 ? Math.min(100, (aiBudget.spentToday / aiBudget.dailyBudget) * 100) : 0
  const monthlyPct = aiBudget.monthlyBudget > 0 ? Math.min(100, (aiBudget.spentThisMonth / aiBudget.monthlyBudget) * 100) : 0

  return (
    <div className="space-y-5">
      <Card title="Account">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">{email ?? 'Not signed in'}</p>
            <p className="text-xs text-slate-600 mt-0.5">Signed in via Supabase</p>
          </div>
          <form action={signout}>
            <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-xs font-medium hover:bg-surface-3 transition-colors">
              <LogOut size={12} /> Sign out
            </button>
          </form>
        </div>
      </Card>

      <Card title="Data Export">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">Download everything you've entered</p>
            <p className="text-xs text-slate-600 mt-0.5">A single JSON file — tasks, applications, expenses, loans, investments, health metrics, resources, documents, and more.</p>
          </div>
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors shrink-0">
            <Download size={12} /> {exporting ? 'Exporting...' : 'Export as JSON'}
          </button>
        </div>
      </Card>

      <Card title="AI Budget" action={<Sparkles size={13} className="text-accent" />}>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-slate-400">Today</span>
              <span className="text-slate-500">${fmtUsd(aiBudget.spentToday)} of ${fmtUsd(aiBudget.dailyBudget)}</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${dailyPct >= 90 ? 'bg-red-400' : 'bg-accent'}`} style={{ width: `${dailyPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-slate-400">This month</span>
              <span className="text-slate-500">${fmtUsd(aiBudget.spentThisMonth)} of ${fmtUsd(aiBudget.monthlyBudget)}</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${monthlyPct >= 90 ? 'bg-red-400' : 'bg-accent'}`} style={{ width: `${monthlyPct}%` }} />
            </div>
          </div>
          <p className="text-xs text-slate-700">Ceilings are set via environment variables (AI_DAILY_BUDGET_USD / AI_MONTHLY_BUDGET_USD) — once hit, AI features fall back to a friendly message instead of erroring.</p>
        </div>
      </Card>

      <Card title="Reminders" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        <p className="text-xs text-slate-600 mb-3">Delivered via Telegram at the morning briefing (~8:30am IST) or evening check-in (~8pm IST).</p>
        {reminders.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No reminders set — add one above</p>
        ) : (
          <ul className="space-y-1.5">
            {reminders.map(r => (
              <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
                <Bell size={14} className={`shrink-0 ${r.slot === 'morning' ? 'text-amber-400' : 'text-indigo-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{r.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{r.slot === 'morning' ? 'Every morning' : 'Every evening'} · {MODULE_LABEL[r.module] ?? r.module}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">New Reminder</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 uppercase tracking-wider">What to be reminded about</label>
                <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Log my weight" autoFocus
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">When</label>
                  <select value={slot} onChange={e => setSlot(e.target.value as ReminderSlot)}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Module</label>
                  <select value={module} onChange={e => setModule(e.target.value)}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {REMINDER_MODULES.map(m => <option key={m} value={m}>{MODULE_LABEL[m]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button onClick={handleAdd} disabled={!label.trim()} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">Add Reminder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
