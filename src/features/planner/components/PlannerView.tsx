'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { addTask, toggleTask, deleteTask } from '../actions'
import { RefreshCw } from 'lucide-react'
import type { Task, Priority, Recurrence } from '../types'

const priorityDot: Record<Priority, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
}

interface Props {
  initialTasks: Task[]
}

export default function PlannerView({ initialTasks }: Props) {
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [area, setArea] = useState('General')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  const [isPending, startTransition] = useTransition()

  const [optimisticTasks, updateOptimisticTasks] = useOptimistic(
    initialTasks,
    (state: Task[], action: { type: string; payload: Partial<Task> & { id?: string } }) => {
      if (action.type === 'add') return [action.payload as Task, ...state]
      if (action.type === 'toggle') {
        const p = action.payload as Partial<Task>
        return state.map(t => t.id === p.id ? { ...t, done: p.done! } : t)
      }
      if (action.type === 'delete') {
        const p = action.payload as Partial<Task>
        return state.filter(t => t.id !== p.id)
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

  return (
    <div className="space-y-4">
      <ModuleRecommendations moduleLabel="Planner" context={plannerContext} />

      <p className="text-xs text-slate-500 uppercase tracking-widest px-0.5">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      <Card
        title="Today's Tasks"
        padding="p-3.5"
        action={<span className="text-xs text-slate-500">{pending.length} remaining</span>}
      >
        {/* Add task row */}
        <div className="flex gap-2 mb-3">
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
        <ul className="space-y-1">
          {pending.map(task => (
            <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
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
            <ul className="space-y-1 mt-2">
              {done.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
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
    </div>
  )
}
