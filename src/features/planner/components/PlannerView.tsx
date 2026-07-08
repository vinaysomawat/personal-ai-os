'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, CheckCircle2, Circle, Trash2, Sparkles, Timer } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { addTask, toggleTask, deleteTask, logFocusSession, deleteFocusSession } from '../actions'
import { smartSortAndFocus } from '@/features/ai/smart-sort'
import { RefreshCw } from 'lucide-react'
import type { Task, Priority, Recurrence, FocusSession } from '../types'

const priorityDot: Record<Priority, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

interface Props {
  initialTasks: Task[]
  initialFocusSessions: FocusSession[]
}

export default function PlannerView({ initialTasks, initialFocusSessions }: Props) {
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [area, setArea] = useState('General')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  const [isPending, startTransition] = useTransition()
  const [aiSorting, setAiSorting] = useState(false)
  const [focusHint, setFocusHint] = useState<string | null>(null)
  const [focusDuration, setFocusDuration] = useState('')
  const [focusLabel, setFocusLabel] = useState('')

  const [focusSessions, updateFocusSessions] = useOptimistic(
    initialFocusSessions,
    (state: FocusSession[], action: { type: 'add' | 'delete'; payload: FocusSession | { id: string } }) => {
      if (action.type === 'add') return [action.payload as FocusSession, ...state]
      if (action.type === 'delete') return state.filter(s => s.id !== (action.payload as { id: string }).id)
      return state
    }
  )
  const totalFocusMinutes = focusSessions.reduce((s, f) => s + f.duration_minutes, 0)

  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks,
    (state: Task[], action: { type: string; payload: Partial<Task> & { id?: string } | Task[] }) => {
      if (action.type === 'add') return [action.payload as Task, ...state]
      if (action.type === 'toggle') {
        const p = action.payload as Partial<Task>
        return state.map(t => t.id === p.id ? { ...t, done: p.done! } : t)
      }
      if (action.type === 'delete') {
        const p = action.payload as Partial<Task>
        return state.filter(t => t.id !== p.id)
      }
      if (action.type === 'reorder') {
        const ordered = action.payload as Task[]
        return ordered
      }
      return state
    }
  )

  const pending = optimisticTasks.filter(t => !t.done)
  const done = optimisticTasks.filter(t => t.done)
  const highPriorityPending = pending.filter(t => t.priority === 'high').length
  const overdue = pending.filter(t => t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
  const plannerContext = `Pending tasks: ${pending.length} (${highPriorityPending} high priority, ${overdue} overdue). Completed today/recently: ${done.length}. Task list: ${pending.slice(0, 10).map(t => `"${t.text}" (${t.priority}${t.due_date ? `, due ${t.due_date}` : ''})`).join('; ') || 'none'}.`

  const handleAdd = () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')

    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      user_id: '',
      text,
      done: false,
      priority,
      area,
      due_date: null,
      recurrence,
      created_at: new Date().toISOString(),
    }

    startTransition(async () => {
      updateOptimisticTasks({ type: 'add', payload: optimistic })
      await addTask(text, priority, area, recurrence)
    })
  }

  const handleToggle = (id: string, done: boolean) => {
    startTransition(async () => {
      updateOptimisticTasks({ type: 'toggle', payload: { id, done: !done } })
      await toggleTask(id, !done)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      updateOptimisticTasks({ type: 'delete', payload: { id } })
      await deleteTask(id)
    })
  }

  const handleLogFocus = () => {
    const minutes = parseInt(focusDuration, 10)
    if (!minutes || minutes <= 0) return
    const label = focusLabel.trim() || null
    setFocusDuration('')
    setFocusLabel('')

    const optimistic: FocusSession = {
      id: `temp-${Date.now()}`,
      user_id: '',
      duration_minutes: minutes,
      label,
      notes: null,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    startTransition(async () => {
      updateFocusSessions({ type: 'add', payload: optimistic })
      await logFocusSession(minutes, label)
    })
  }

  const handleDeleteFocus = (id: string) => {
    startTransition(async () => {
      updateFocusSessions({ type: 'delete', payload: { id } })
      await deleteFocusSession(id)
    })
  }

  const handleSmartSort = async () => {
    if (pending.length < 2) return
    setAiSorting(true)
    setFocusHint(null)
    try {
      const { order, focus } = await smartSortAndFocus(pending)
      const idToTask = new Map(pending.map(t => [t.id, t]))
      const reordered = order.map(id => idToTask.get(id)).filter(Boolean) as Task[]
      const missing = pending.filter(t => !order.includes(t.id))
      updateOptimisticTasks({ type: 'reorder', payload: [...reordered, ...missing, ...done] })
      setFocusHint(focus)
    } finally {
      setAiSorting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div
            key={d}
            className={`flex flex-col items-center p-2.5 rounded-xl border transition-colors ${
              i === todayIdx
                ? 'bg-accent border-accent text-white'
                : 'bg-surface-1 border-surface-3 text-slate-400'
            }`}
          >
            <span className="text-xs font-medium">{d}</span>
            <span className={`text-base font-bold mt-0.5 ${i === todayIdx ? 'text-white' : 'text-slate-300'}`}>
              {new Date(Date.now() + (i - todayIdx) * 86400000).getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* AI focus hint */}
      {focusHint && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-accent/10 border border-accent/20 rounded-xl">
          <Sparkles size={14} className="text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300">{focusHint}</p>
        </div>
      )}

      <Card
        title="Today's Tasks"
        action={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{pending.length} remaining</span>
            {pending.length >= 2 && (
              <button
                onClick={handleSmartSort}
                disabled={aiSorting}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
              >
                <Sparkles size={11} />
                {aiSorting ? 'Sorting...' : 'AI Sort'}
              </button>
            )}
          </div>
        }
      >
        {/* Add task row */}
        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Priority)}
            className="bg-surface-2 border border-surface-3 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={recurrence ?? ''}
            onChange={e => setRecurrence((e.target.value as Recurrence) || null)}
            className="bg-surface-2 border border-surface-3 rounded-lg px-2 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors"
          >
            <option value="">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={isPending || !input.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {pending.length === 0 && (
          <p className="text-sm text-slate-600 text-center py-6">No tasks — add one above</p>
        )}
        <ul className="space-y-1.5">
          {pending.map((task, i) => (
            <li key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
              {aiSorting && (
                <span className="text-xs text-accent/60 font-mono w-4 shrink-0">{i + 1}</span>
              )}
              <button onClick={() => handleToggle(task.id, task.done)} className="shrink-0">
                <Circle size={16} className="text-slate-600 group-hover:text-accent transition-colors" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{task.text}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-600">{task.area}</p>
                  {task.recurrence && (
                    <span className="flex items-center gap-0.5 text-xs text-accent/70">
                      <RefreshCw size={9} />{task.recurrence}
                    </span>
                  )}
                </div>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
              <button
                onClick={() => handleDelete(task.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>

        {done.length > 0 && (
          <details className="mt-4">
            <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none list-none">
              <span>›</span> Completed ({done.length})
            </summary>
            <ul className="space-y-1.5 mt-2">
              {done.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
                  <button onClick={() => handleToggle(task.id, task.done)} className="shrink-0">
                    <CheckCircle2 size={16} className="text-green-500" />
                  </button>
                  <p className="flex-1 text-sm text-slate-500 line-through">{task.text}</p>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {/* Deep work / focus sessions — PRD-v2 Productivity pillar, previously untracked */}
      <Card
        title="Focus Sessions"
        action={<span className="text-xs text-slate-500">{totalFocusMinutes} min today</span>}
      >
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            min={1}
            value={focusDuration}
            onChange={e => setFocusDuration(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogFocus()}
            placeholder="Minutes"
            className="w-24 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
          />
          <input
            value={focusLabel}
            onChange={e => setFocusLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogFocus()}
            placeholder="What on? (optional)"
            className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleLogFocus}
            disabled={!focusDuration}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            <Timer size={14} />
            Log
          </button>
        </div>

        {focusSessions.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-4">No focus sessions logged today</p>
        ) : (
          <ul className="space-y-1.5">
            {focusSessions.map(session => (
              <li key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
                <Timer size={14} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">{session.duration_minutes} min{session.label ? ` — ${session.label}` : ''}</p>
                </div>
                <button
                  onClick={() => handleDeleteFocus(session.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ModuleRecommendations moduleLabel="Planner" context={plannerContext} />
    </div>
  )
}
