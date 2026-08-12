'use client'

import { useState, useOptimistic, useTransition } from 'react'
import Card from '@/components/Card'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import FieldError from '@/components/FieldError'
import { signout } from '@/app/login/actions'
import { todayIST } from '@/lib/date'
import { addReminder, toggleReminder, deleteReminder, exportAllData } from '../actions'
import { REMINDER_MODULES } from '../types'
import type { Reminder, ReminderSlot } from '../types'
import type { CronJobHealth } from '@/lib/cron-log'
import { useEscapeKey } from '@/lib/use-escape-key'

const MODULE_LABEL: Record<string, string> = {
  planner: 'Planner', career: 'Career', finance: 'Finance', health: 'Health',
  learning: 'Learning', coding: 'Coding',
}

const TASK_LABEL: Record<string, string> = {
  telegram_intent: 'Telegram intent parsing',
  career_mentor: 'Career Mentor', interview_questions: 'Interview question generation', finance_advisor: 'Money Advisor',
  health_report: 'Health report', health_daily_plan: 'Daily health plan', health_advisor: 'Health Coach',
  study_plan: 'Study plan', resource_quiz: 'Resource quiz', coding_mentor: 'Code Mentor',
  module_recommendations: 'Module recommendations', daily_briefing: 'Daily briefing',
  weekly_digest: 'Weekly digest', monthly_digest: 'Monthly digest', telegram_vision: 'Photo recognition',
}

const JOB_LABEL: Record<string, string> = {
  'daily-briefing': 'Daily Briefing', 'daily-coding': 'Daily Coding', 'recurring-expenses': 'Recurring Expenses',
  'daily-read': 'Daily Read', 'evening-checkin': 'Evening Check-in',
  'monthly-digest': 'Monthly Digest', 'weekly-digest': 'Weekly Digest', 'health-tip': 'Health Tip', 'job-alerts': 'Job Alerts',
  'daily-journal': 'Daily Journal', 'learning-tip': 'Learning Tip', 'cron-health-check': 'Cron Health Check',
}

const STATUS_ORDER: Record<CronJobHealth['status'], number> = { stale: 0, 'never-seen': 1, healthy: 2 }

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

function barColor(pct: number): string {
  if (pct >= 90) return 'bg-risk'
  if (pct >= 70) return 'bg-warn'
  return 'bg-accent'
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
    (state: Reminder[], action: { type: 'add' | 'delete' | 'toggle'; payload: Reminder | { id: string } | { id: string; active: boolean } }) => {
      if (action.type === 'add') return [action.payload as Reminder, ...state]
      if (action.type === 'delete') return state.filter(r => r.id !== (action.payload as { id: string }).id)
      if (action.type === 'toggle') {
        const p = action.payload as { id: string; active: boolean }
        return state.map(r => r.id === p.id ? { ...r, active: p.active } : r)
      }
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

  const handleToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      updateReminders({ type: 'toggle', payload: { id, active } })
      await toggleReminder(id, active)
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

  const sortedHealth = [...systemHealth].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  const staleCount = systemHealth.filter(h => h.status === 'stale').length

  return (
    <div className="space-y-3">
      <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Settings</h1>
      <Card title="Account">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-fg-secondary">{email ?? 'Not signed in'}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExport} disabled={exporting} className="px-3.5 py-[7px] rounded-[7px] border border-border-strong text-[12.5px] text-fg-primary hover:bg-surface-2 disabled:opacity-50 transition-colors">
              {exporting ? 'Exporting...' : 'Export as JSON'}
            </button>
            <form action={signout}>
              <button type="submit" className="px-3.5 py-[7px] rounded-[7px] border border-border-strong text-[12.5px] text-fg-secondary hover:bg-surface-2 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <p className="text-xs text-fg-quaternary mt-2.5">Signed in via Supabase. Export downloads a single JSON file — tasks, applications, expenses, loans, investments, health metrics, resources, and more.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <Card title="AI Budget">
          <div className="space-y-3.5">
            <div>
              <div className="text-[12.5px] text-fg-secondary mb-1">Today: ${fmtUsd(aiBudget.spentToday)} of ${fmtUsd(aiBudget.dailyBudget)}</div>
              <div className="h-1.5 bg-surface-2 rounded-[4px] overflow-hidden">
                <div className={`h-full rounded-[4px] transition-all ${barColor(dailyPct)}`} style={{ width: `${dailyPct}%` }} />
              </div>
            </div>
            <div>
              <div className="text-[12.5px] text-fg-secondary mb-1">This month: ${fmtUsd(aiBudget.spentThisMonth)} of ${fmtUsd(aiBudget.monthlyBudget)}</div>
              <div className="h-1.5 bg-surface-2 rounded-[4px] overflow-hidden">
                <div className={`h-full rounded-[4px] transition-all ${barColor(monthlyPct)}`} style={{ width: `${monthlyPct}%` }} />
              </div>
            </div>
            <p className="text-xs text-fg-quaternary">Ceilings are set via environment variables (AI_DAILY_BUDGET_USD / AI_MONTHLY_BUDGET_USD) — once hit, AI features fall back to a friendly message instead of erroring.</p>
            {aiBudget.spendByTask.length > 0 && (
              <div className="pt-1 border-t border-surface-3">
                <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2 mt-3">Top spend by feature</p>
                <ul className="space-y-1.5">
                  {aiBudget.spendByTask.slice(0, 5).map(({ task, cost }) => (
                    <li key={task} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-fg-secondary">{TASK_LABEL[task] ?? task}</span>
                      <span className="text-fg-tertiary tabular-nums">${fmtUsd(cost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <Card title="System Health" action={
          <span className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[6px] ${staleCount > 0 ? 'bg-risk-soft text-risk' : 'bg-good-soft text-good'}`}>
            {staleCount > 0 ? `${staleCount} stale` : 'All healthy'}
          </span>
        }>
          <p className="text-xs text-fg-quaternary mb-3">Scheduled jobs (Vercel Cron) — last confirmed run, and whether it&apos;s within its expected cadence.</p>
          <ul className="space-y-[9px]">
            {sortedHealth.map(h => (
              <li key={h.job} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${h.status === 'healthy' ? 'bg-good' : h.status === 'stale' ? 'bg-risk' : 'bg-fg-quaternary'}`} />
                <span className="flex-1 text-[12.5px] text-fg-primary">{JOB_LABEL[h.job] ?? h.job}</span>
                <span className={`text-[12.5px] shrink-0 ${h.status === 'stale' ? 'text-risk font-semibold' : 'text-fg-tertiary font-normal'}`}>
                  {h.lastRun ? fmtRelativeTime(h.lastRun) : 'never run yet'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Reminders" action={
        <button onClick={() => setShowForm(true)} className="px-3 py-[7px] rounded-[7px] bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors">
          + New Reminder
        </button>
      }>
        <p className="text-xs text-fg-quaternary mb-3">Delivered via Telegram at the morning briefing (~8:30am IST) or evening check-in (~8pm IST).</p>
        {reminders.length === 0 ? (
          <div className="text-center py-5">
            <div className="text-xl mb-1.5">🔔</div>
            <p className="text-[13px] text-fg-tertiary">No reminders set yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {reminders.map(r => (
              <li key={r.id} className="flex items-center gap-2.5 bg-surface-2 rounded-[10px] px-3.5 py-2.5 text-[13px]">
                <button onClick={() => handleToggle(r.id, !r.active)} aria-label={r.active ? 'Deactivate' : 'Activate'} title={r.active ? 'Deactivate' : 'Activate'} className="shrink-0 text-[15px] leading-none">
                  {r.active ? '🔔' : '🔕'}
                </button>
                <span className={`flex-1 ${r.active ? 'text-fg-primary' : 'text-fg-quaternary'}`}>{r.label}</span>
                <span className="text-fg-tertiary text-xs whitespace-nowrap">{MODULE_LABEL[r.module] ?? r.module} · {r.slot === 'morning' ? 'Morning' : 'Evening'}</span>
                <button onClick={() => handleDelete(r.id)} aria-label="Delete reminder" className="shrink-0 text-fg-quaternary hover:text-risk transition-colors text-xs leading-none p-0.5">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showForm && (
        <Modal title="New Reminder" onClose={() => setShowForm(false)}>
          <form className="flex flex-col gap-3.5" onSubmit={e => { e.preventDefault(); handleAdd() }}>
            <div>
              <label className={modalLabelClass}>Label</label>
              <input value={label} onChange={e => { setLabel(e.target.value); setLabelInvalid(false) }} placeholder="e.g. Log weight" autoFocus
                className={modalInputClass(labelInvalid)} />
              <FieldError show={labelInvalid} />
            </div>
            <div>
              <label className={modalLabelClass}>Module</label>
              <select value={module} onChange={e => setModule(e.target.value)} className={modalSelectClass}>
                {REMINDER_MODULES.map(m => <option key={m} value={m}>{MODULE_LABEL[m]}</option>)}
              </select>
            </div>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setSlot('morning')}
                className={`flex-1 rounded-[8px] px-3 py-[9px] text-[13px] text-fg-primary transition-colors ${slot === 'morning' ? 'bg-accent-soft border border-accent-border' : 'bg-surface-2 border border-surface-3'}`}>
                🔔 Morning
              </button>
              <button type="button" onClick={() => setSlot('evening')}
                className={`flex-1 rounded-[8px] px-3 py-[9px] text-[13px] text-fg-primary transition-colors ${slot === 'evening' ? 'bg-accent-soft border border-accent-border' : 'bg-surface-2 border border-surface-3'}`}>
                🔕 Evening
              </button>
            </div>
            <div className="flex justify-end gap-2.5 mt-1.5">
              <button type="button" onClick={() => setShowForm(false)} className={modalCancelButtonClass}>Cancel</button>
              <button type="submit" disabled={!label.trim()} className={modalSaveButtonClass}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
