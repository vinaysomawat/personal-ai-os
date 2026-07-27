'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import Card from '@/components/Card'
import { addGoal, updateGoalProgress, toggleGoalAchieved, deleteGoal } from '../actions'
import type { ResolvedGoal, GoalModule, AutoMetric } from '../types'

const AUTO_METRIC_LABEL: Record<AutoMetric, string> = {
  coding_streak: 'Coding streak (auto-tracked)',
  books_completed: 'Books completed (auto-tracked)',
}

interface GoalsCardProps {
  module: GoalModule
  initialGoals: ResolvedGoal[]
  // Which auto-computed metric this module supports, if any — coding_streak
  // only makes sense on the Coding page, books_completed only on Learning.
  autoMetric?: AutoMetric
}

export default function GoalsCard({ module, initialGoals, autoMetric }: GoalsCardProps) {
  const [goals, setGoals] = useState(initialGoals)
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [useAutoMetric, setUseAutoMetric] = useState(!!autoMetric)
  const [targetDate, setTargetDate] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    const target = targetValue ? Number(targetValue) : null
    startTransition(async () => {
      await addGoal(module, name.trim(), target, useAutoMetric && autoMetric ? autoMetric : null, targetDate || null)
      setName(''); setTargetValue(''); setTargetDate(''); setShowForm(false)
      const { getGoals } = await import('../actions')
      setGoals(await getGoals(module))
    })
  }

  const handleProgress = (id: string, value: string) => {
    const num = Number(value)
    setGoals(prev => prev.map(g => g.id === id ? { ...g, resolvedCurrentValue: num } : g))
    startTransition(() => updateGoalProgress(id, module, num))
  }

  const handleAchieved = (id: string, achieved: boolean) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, achieved_at: achieved ? new Date().toISOString() : null } : g))
    startTransition(() => toggleGoalAchieved(id, module, achieved))
  }

  const handleDelete = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    startTransition(() => deleteGoal(id, module))
  }

  return (
    <Card title="Goals" padding="p-3.5" action={
      <button onClick={() => setShowForm(v => !v)} aria-label="Add goal" className="text-fg-tertiary hover:text-accent transition-colors"><Plus size={15} /></button>
    }>
      {showForm && (
        <div className="space-y-2 mb-3 pb-3 border-b border-surface-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Goal name"
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
          {autoMetric && (
            <label className="flex items-center gap-2 text-xs text-fg-secondary">
              <input type="checkbox" checked={useAutoMetric} onChange={e => setUseAutoMetric(e.target.checked)} />
              {AUTO_METRIC_LABEL[autoMetric]}
            </label>
          )}
          <div className="flex gap-2">
            <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="Target number (optional)"
              className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent transition-colors" />
          </div>
          <button onClick={handleAdd} disabled={!name.trim()} className="w-full px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">Add</button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-sm text-fg-secondary">No goals set yet</p>
      ) : (
        <ul className="space-y-3">
          {goals.map(g => {
            const hasMetric = g.target_value != null
            const pct = hasMetric && g.target_value! > 0 ? Math.min(100, Math.round(((g.resolvedCurrentValue ?? 0) / g.target_value!) * 100)) : null
            return (
              <li key={g.id}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm text-fg-secondary">{g.name}</p>
                  <button onClick={() => handleDelete(g.id)} aria-label="Delete goal" className="shrink-0 text-fg-quaternary hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
                {hasMetric ? (
                  <>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-fg-quaternary">{g.resolvedCurrentValue ?? 0} of {g.target_value}{g.target_date ? ` · by ${g.target_date}` : ''}</p>
                      {!g.auto_metric && (
                        <input type="number" defaultValue={g.current_value ?? 0} onBlur={e => handleProgress(g.id, e.target.value)}
                          className="w-16 bg-surface-2 border border-surface-3 rounded px-1.5 py-0.5 text-xs text-fg-secondary outline-none focus:border-accent transition-colors" />
                      )}
                    </div>
                  </>
                ) : (
                  <button onClick={() => handleAchieved(g.id, !g.achieved_at)} className={`flex items-center gap-1.5 text-xs ${g.achieved_at ? 'text-green-400' : 'text-fg-tertiary hover:text-fg-secondary'} transition-colors`}>
                    <Check size={13} /> {g.achieved_at ? 'Achieved' : 'Mark as achieved'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
