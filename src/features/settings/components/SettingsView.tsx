'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, Bell, LogOut, Sparkles, Download, Activity } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import FieldError from '@/components/FieldError'
import { signout } from '@/app/login/actions'
import { todayIST } from '@/lib/date'
import { addReminder, deleteReminder, exportAllData } from '../actions'
import { REMINDER_MODULES } from '../types'
import type { Reminder, ReminderSlot } from '../types'
import type { CronJobHealth } from '@/lib/cron-log'
import { useEscapeKey } from '@/lib/use-escape-key'

const MODULE_LABEL: Record<string, string> = {
  planner: 'Planner', career: 'Career', finance: 'Finance', health: 'Health',
  learning: 'Learning', coding: 'Coding', documents: 'Documents',
}

const TASK_LABEL: Record<string, string> = {
  telegram_intent: 'Telegram intent parsing', doc_summary: 'Document summaries', doc_qa: 'Document Q&A',
  career_mentor: 'Career Mentor', interview_questions: 'Interview question generation', finance_advisor: 'Money Advisor',
  health_report: 'Health report', health_daily_plan: 'Daily health plan', health_advisor: 'Health Coach',
  study_plan: 'Study plan', resource_quiz: 'Resource quiz', coding_mentor: 'Code Mentor',
  module_recommendations: 'Module recommendations', daily_briefing: 'Daily briefing',
  weekly_digest: 'Weekly digest', monthly_digest: 'Monthly digest', telegram_vision: 'Photo recognition',
}

const JOB_LABEL: Record<string, string> = {
  'daily-briefing': 'Daily Briefing', 'daily-coding': 'Daily Coding', 'recurring-expenses': 'Recurring Expenses',
  'sip-contribution': 'SIP Contribution', 'trending-reading': 'Trending Reading', 'evening-checkin': 'Evening Check-in',
  'monthly-digest': 'Monthly Digest', 'weekly-digest': 'Weekly Digest', 'health-tip': 'Health Tip', 'job-alerts': 'Job Alerts',
}

function fmtUsd(n: number): string {
  if (n === 0) return '0.00'
  if (n < 0.01) return n.toFixed(4)
  return n.toFixed(2)
}

function fmtRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface Props {
  email: string | null
  initialReminders: Reminder[]
  aiBudget: { dailyBudget: number; monthlyBudget: number; spentToday: number; spentThisMonth: number; spendByTask: { task: string; cost: number }[] }
  systemHealth: CronJobHealth[]
}

export default function SettingsView({ email, initialReminders, aiBudget, systemHealth }: Props) {
  const [showForm, setShowForm] = useState(false)
  useEscapeKey(() => setShowForm(false))
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

  const [labelInvalid, setLabelInvalid] = useState(false)

  const handleAdd = () => {
    if (!label.trim()) { setLabelInvalid(true); return }
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
      a.download = `personal-os-export-${todayIST()}.json`
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
      <Card title="Account" padding="p-3.5">
        <div className="divide-y divide-surface-3">
          <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm text-slate-200">{email ?? 'Not signed in'}</p>
              <p className="text-xs text-slate-600 mt-0.5">Signed in via Supabase</p>
            </div>
            <form action={signout}>
              <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-xs font-medium hover:bg-surface-3 transition-colors shrink-0">
                <LogOut size={12} /> Sign out
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0 gap-3">
            <div>
              <p className="text-sm text-slate-300">Download everything you&apos;ve entered</p>
              <p className="text-xs text-slate-600 mt-0.5">A single JSON file — tasks, applications, expenses, loans, investments, health metrics, resources, documents, and more.</p>
            </div>
            <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors shrink-0">
              <Download size={12} /> {exporting ? 'Exporting...' : 'Export as JSON'}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <Card title="AI Budget" padding="p-3.5" action={<Sparkles size={13} className="text-accent" />}>
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
          {aiBudget.spendByTask.length > 0 && (
            <div className="pt-1 border-t border-surface-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 mt-3">This month, by feature</p>
              <ul className="space-y-1.5">
                {aiBudget.spendByTask.slice(0, 5).map(({ task, cost }) => (
                  <li key={task} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{TASK_LABEL[task] ?? task}</span>
                    <span className="text-slate-500 tabular-nums">${fmtUsd(cost)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card title="System Health" padding="p-3.5" action={<Activity size={13} className="text-accent" />}>
        <p className="text-xs text-slate-600 mb-3">Scheduled jobs (Vercel Cron) — last confirmed run, and whether it&apos;s within its expected cadence.</p>
        <ul className="space-y-1.5">
          {systemHealth.map(h => (
            <li key={h.job} className="flex items-center gap-3 py-1">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.status === 'healthy' ? 'bg-green-400' : h.status === 'stale' ? 'bg-red-400' : 'bg-slate-600'}`} />
              <span className="flex-1 text-sm text-slate-300">{JOB_LABEL[h.job] ?? h.job}</span>
              <span className={`text-xs shrink-0 ${h.status === 'stale' ? 'text-red-400' : 'text-slate-600'}`}>
                {h.lastRun ? fmtRelativeTime(h.lastRun) : 'never run yet'}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      </div>

      <Card title="Reminders" padding="p-3.5" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        <p className="text-xs text-slate-600 mb-3">Delivered via Telegram at the morning briefing (~8:30am IST) or evening check-in (~8pm IST).</p>
        {reminders.length === 0 ? (
          <EmptyState icon={Bell} message="No reminders set — add one above" compact />
        ) : (
          <ul className="space-y-1.5">
            {reminders.map(r => (
              <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
                <Bell size={14} className={`shrink-0 ${r.slot === 'morning' ? 'text-amber-400' : 'text-indigo-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{r.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{r.slot === 'morning' ? 'Every morning' : 'Every evening'} · {MODULE_LABEL[r.module] ?? r.module}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} aria-label="Delete reminder" className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">New Reminder</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="p-1.5 -m-1.5 text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleAdd() }}>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 uppercase tracking-wider">What to be reminded about</label>
                <input value={label} onChange={e => { setLabel(e.target.value); setLabelInvalid(false) }} placeholder="Log my weight" autoFocus
                  className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors ${labelInvalid ? 'border-red-500' : 'border-surface-3'}`} />
                <FieldError show={labelInvalid} />
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
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button type="submit" disabled={!label.trim()} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 active:scale-95 transition">Add Reminder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
