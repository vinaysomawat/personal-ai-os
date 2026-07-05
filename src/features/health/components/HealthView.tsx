'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, X, Flame, Sparkles, ChevronDown } from 'lucide-react'
import Card from '@/components/Card'
import { addHabit, logHabit, unlogHabit, deleteHabit, upsertTodayMetric } from '../actions'
import { getHealthReport } from '@/features/ai/health-report'
import type { HabitWithLogs, HealthMetric, MetricField } from '../types'

const ICONS = ['🏋️', '💧', '😴', '🧘', '📚', '🏃', '🥗', '💊', '🚴', '✍️']

const METRICS: { field: MetricField; label: string; emoji: string; unit: string; decimals?: number }[] = [
  { field: 'weight_kg',    label: 'Weight',   emoji: '⚖️',  unit: 'kg',   decimals: 1 },
  { field: 'calories',     label: 'Calories', emoji: '🔥',  unit: 'kcal' },
  { field: 'protein_g',    label: 'Protein',  emoji: '🥩',  unit: 'g' },
  { field: 'sleep_hours',  label: 'Sleep',    emoji: '😴',  unit: 'hrs',  decimals: 1 },
  { field: 'steps',        label: 'Steps',    emoji: '👟',  unit: 'steps' },
  { field: 'water_ml',     label: 'Water',    emoji: '💧',  unit: 'ml' },
]

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function getStreak(logs: { date: string }[]): number {
  const dates = new Set(logs.map(l => l.date))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (dates.has(d.toISOString().split('T')[0])) streak++
    else break
  }
  return streak
}

function WeightChart({ metrics }: { metrics: HealthMetric[] }) {
  const withWeight = [...metrics].filter(m => m.weight_kg !== null).sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
  if (withWeight.length < 2) return (
    <p className="text-xs text-slate-600 py-2">Log weight on 2+ days to see trend</p>
  )
  const weights = withWeight.map(m => m.weight_kg!)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 0.1
  const trend = weights[weights.length - 1] - weights[0]

  return (
    <div>
      <div className="flex items-end gap-1 h-14">
        {withWeight.map((m, i) => {
          const h = Math.round(((m.weight_kg! - min) / range) * 44 + 4)
          const isLatest = i === withWeight.length - 1
          return (
            <div key={m.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <div className={`w-full rounded-sm transition-all ${isLatest ? 'bg-accent' : 'bg-surface-3'}`} style={{ height: `${h}px` }} />
              <span className="text-xs text-slate-700 hidden sm:block">{new Date(m.date + 'T12:00:00').getDate()}</span>
            </div>
          )
        })}
      </div>
      <p className={`text-xs mt-2 font-medium ${trend < 0 ? 'text-green-400' : trend > 0 ? 'text-red-400' : 'text-slate-500'}`}>
        {trend < 0 ? `↓ ${Math.abs(trend).toFixed(1)} kg` : trend > 0 ? `↑ ${trend.toFixed(1)} kg` : '→ Stable'} over {withWeight.length} days
        <span className="text-slate-600 font-normal ml-2">· Latest: {weights[weights.length - 1]} kg</span>
      </p>
    </div>
  )
}

function MetricCard({ field, label, emoji, unit, decimals = 0, todayValue, weekAvg, onSave, saving }: {
  field: MetricField; label: string; emoji: string; unit: string; decimals?: number
  todayValue: number | null; weekAvg: number | null; onSave: (v: number) => void; saving: boolean
}) {
  const [input, setInput] = useState(todayValue !== null ? String(todayValue) : '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const v = parseFloat(input)
    if (isNaN(v) || v <= 0) return
    if (v === todayValue) return
    onSave(v)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col gap-2 hover:border-surface-3/80 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-lg">{emoji}</span>
        {saved && <span className="text-xs text-green-400">✓</span>}
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            onBlur={handleSave}
            placeholder="—"
            disabled={saving}
            className="text-xl font-bold text-white bg-transparent outline-none w-full placeholder-slate-700"
          />
          <span className="text-xs text-slate-600 shrink-0">{unit}</span>
        </div>
      </div>
      <p className="text-xs text-slate-700">7d avg: {weekAvg !== null ? weekAvg.toFixed(decimals) : '—'}</p>
    </div>
  )
}

interface Props {
  initialHabits: HabitWithLogs[]
  initialMetrics: HealthMetric[]
}

export default function HealthView({ initialHabits, initialMetrics }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🏋️')
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState<MetricField | null>(null)
  const [metrics, setMetrics] = useState<HealthMetric[]>(initialMetrics)
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const days = getLast7Days()
  const today = days[6]

  const todayMetric = metrics.find(m => m.date === today) ?? null
  const week = metrics.filter(m => days.includes(m.date))

  const weekAvg = (field: MetricField): number | null => {
    const vals = week.map(m => m[field]).filter((v): v is number => v !== null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }

  const handleMetricSave = (field: MetricField, value: number) => {
    setSaving(field)
    setMetrics(prev => {
      const existing = prev.find(m => m.date === today)
      if (existing) return prev.map(m => m.date === today ? { ...m, [field]: value } : m)
      return [{ id: `temp`, user_id: '', date: today, weight_kg: null, calories: null, protein_g: null, sleep_hours: null, steps: null, water_ml: null, notes: null, created_at: new Date().toISOString(), [field]: value }, ...prev]
    })
    upsertTodayMetric(field, value).finally(() => setSaving(null))
  }

  const handleAIReport = async () => {
    if (aiLoading) return
    if (showAI && aiReport) { setShowAI(false); return }
    setShowAI(true)
    setAiLoading(true)
    try {
      const report = await getHealthReport(metrics)
      setAiReport(report)
    } finally {
      setAiLoading(false)
    }
  }

  const [habits, updateHabits] = useOptimistic(
    initialHabits,
    (state: HabitWithLogs[], action: { type: string; payload: Record<string, string> }) => {
      if (action.type === 'add') return [...state, { id: `temp-${Date.now()}`, user_id: '', name: action.payload.name, icon: action.payload.icon, created_at: new Date().toISOString(), logs: [] }]
      if (action.type === 'log') return state.map(h => h.id === action.payload.habitId ? { ...h, logs: [...h.logs, { id: `temp-log`, user_id: '', habit_id: action.payload.habitId, date: action.payload.date, created_at: new Date().toISOString() }] } : h)
      if (action.type === 'unlog') return state.map(h => h.id === action.payload.habitId ? { ...h, logs: h.logs.filter(l => l.date !== action.payload.date) } : h)
      if (action.type === 'delete') return state.filter(h => h.id !== action.payload.id)
      return state
    }
  )

  const handleAdd = () => {
    if (!newName.trim()) return
    const name = newName.trim(); const icon = newIcon
    setNewName(''); setShowForm(false)
    startTransition(async () => { updateHabits({ type: 'add', payload: { name, icon } }); await addHabit(name, icon) })
  }

  const handleToggle = (habitId: string, date: string, logged: boolean) => {
    startTransition(async () => {
      if (logged) { updateHabits({ type: 'unlog', payload: { habitId, date } }); await unlogHabit(habitId, date) }
      else { updateHabits({ type: 'log', payload: { habitId, date } }); await logHabit(habitId, date) }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => { updateHabits({ type: 'delete', payload: { id } }); await deleteHabit(id) })
  }

  const completedToday = habits.filter(h => h.logs.some(l => l.date === today)).length
  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => getStreak(h.logs))) : 0

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-accent">{completedToday}/{habits.length}</span>
          <span className="text-xs text-slate-500 mt-1">Habits today</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-slate-200">{todayMetric?.weight_kg ?? '—'}</span>
          <span className="text-xs text-slate-500 mt-1">Weight (kg)</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-amber-400">{bestStreak}</span>
          <span className="text-xs text-slate-500 mt-1">Best streak</span>
        </div>
      </div>

      {/* Today's metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Today&apos;s Metrics</h3>
          <span className="text-xs text-slate-600">Press Enter to save</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {METRICS.map(m => (
            <MetricCard
              key={m.field}
              {...m}
              todayValue={todayMetric?.[m.field] ?? null}
              weekAvg={weekAvg(m.field)}
              onSave={v => handleMetricSave(m.field, v)}
              saving={saving === m.field}
            />
          ))}
        </div>
      </div>

      {/* Weight trend */}
      <Card title="Weight Trend">
        <WeightChart metrics={metrics} />
      </Card>

      {/* AI Health Coach */}
      <div className="border border-surface-3 rounded-xl overflow-hidden">
        <button onClick={handleAIReport} className="w-full flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-sm font-medium text-slate-300">AI Weekly Health Report</span>
          </div>
          <div className="flex items-center gap-2">
            {aiLoading && <span className="text-xs text-slate-500">Analysing...</span>}
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showAI ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showAI && (
          <div className="px-4 py-4 bg-surface-1 border-t border-surface-3">
            {aiLoading ? (
              <div className="space-y-2">
                {[90, 70, 80, 60, 85].map((w, i) => (
                  <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : aiReport ? (
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiReport}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Habit tracker */}
      <Card title="Weekly Habits" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add habit
        </button>
      }>
        <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr repeat(7, 2rem)' }}>
          <span className="text-xs text-slate-600">Habit</span>
          {days.map(d => (
            <span key={d} className={`text-xs text-center font-medium ${d === today ? 'text-accent' : 'text-slate-600'}`}>
              {new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}
            </span>
          ))}
          <span />
        </div>

        {habits.length === 0 && <p className="text-sm text-slate-600 text-center py-8">No habits yet — add one above</p>}

        <ul className="space-y-2">
          {habits.map(habit => {
            const streak = getStreak(habit.logs)
            return (
              <li key={habit.id} className="grid items-center gap-2 group" style={{ gridTemplateColumns: '1fr repeat(7, 2rem) 1.5rem' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{habit.icon}</span>
                  <span className="text-sm text-slate-300 truncate">{habit.name}</span>
                  {streak > 0 && <span className="flex items-center gap-0.5 text-xs text-amber-400 shrink-0"><Flame size={10} />{streak}</span>}
                </div>
                {days.map(date => {
                  const logged = habit.logs.some(l => l.date === date)
                  return (
                    <button key={date} onClick={() => handleToggle(habit.id, date, logged)} disabled={isPending}
                      className={`w-8 h-8 rounded-lg border transition-colors ${logged ? 'bg-accent border-accent text-white' : date === today ? 'bg-surface-2 border-accent/30 hover:border-accent/60' : 'bg-surface-2 border-surface-3 hover:border-slate-500'}`}>
                      {logged && <span className="text-xs">✓</span>}
                    </button>
                  )
                })}
                <button onClick={() => handleDelete(habit.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Add habit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">New Habit</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Morning workout" autoFocus
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setNewIcon(icon)}
                      className={`w-9 h-9 rounded-lg text-lg border transition-colors ${newIcon === icon ? 'bg-accent/20 border-accent' : 'bg-surface-2 border-surface-3 hover:border-slate-500'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button onClick={handleAdd} disabled={!newName.trim()} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">Add Habit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
