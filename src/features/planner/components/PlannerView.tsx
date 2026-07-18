'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, CheckCircle2, Circle, Trash2, Sparkles, ExternalLink } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { addTask, toggleTask, deleteTask } from '../actions'
import { RefreshCw } from 'lucide-react'
import { todayIST } from '@/lib/date'
import type { Task, Priority, Recurrence } from '../types'

const priorityDot: Record<Priority, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
}

// A task's "relevant month" is its due_date's month if set, else the month
// it was created in — so undated tasks implicitly belong to the month they
// were added, and roll into Overdue once that month passes uncompleted.
function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

function PendingTaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  return (
    <li className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-surface-2 transition-colors group">
      <button onClick={() => onToggle(task.id, task.done)} className="shrink-0">
        <Circle size={16} className="text-slate-600 group-hover:text-accent transition-colors" />
      </button>
      <p className="flex-1 min-w-0 text-sm text-slate-200 truncate">{task.text}</p>
      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-slate-500">{task.area}</span>
      {task.recurrence && (
        <span className="shrink-0 flex items-center gap-0.5 text-xs text-accent/70">
          <RefreshCw size={9} />{task.recurrence}
        </span>
      )}
      {task.due_date && (
        <span className={`shrink-0 text-xs ${task.due_date < todayIST() ? 'text-red-400' : 'text-slate-600'}`}>
          due {task.due_date}
        </span>
      )}
      {task.external_url && (
        <a href={task.external_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="shrink-0 text-slate-600 hover:text-accent transition-colors">
          <ExternalLink size={13} />
        </a>
      )}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[task.priority]}`} />
      <button onClick={() => onDelete(task.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
        <Trash2 size={13} />
      </button>
    </li>
  )
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

  const currentMonthKey = monthKey(new Date().toISOString())
  const overduePending = pending.filter(t => monthKey(t.due_date ?? t.created_at) < currentMonthKey)
  const thisMonthPending = pending.filter(t => monthKey(t.due_date ?? t.created_at) >= currentMonthKey)
  const overdue = overduePending.length

  const plannerContext = `Pending tasks: ${pending.length} (${highPriorityPending} high priority, ${overdue} overdue from previous months). Completed today/recently: ${done.length}. Task list: ${thisMonthPending.slice(0, 10).map(t => `"${t.text}" (${t.priority}${t.due_date ? `, due ${t.due_date}` : ''})`).join('; ') || 'none'}.`

  const byArea = pending.reduce<Record<string, number>>((acc, t) => {
    acc[t.area] = (acc[t.area] ?? 0) + 1
    return acc
  }, {})
  const areaEntries = Object.entries(byArea).sort((a, b) => b[1] - a[1])

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
      external_url: null,
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

  const advisorOpen = useAIAdvisorOpen()
  const advisorPortal = useAIAdvisor('Plan Coach', Sparkles, (
    <ModuleRecommendations moduleLabel="Planner" context={plannerContext} isOpen={advisorOpen} />
  ))

  return (
    <div className="space-y-4">
      {advisorPortal}
      <p className="text-xs text-slate-500 uppercase tracking-widest px-0.5">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-slate-200">{pending.length}</span>
          <span className="text-xs text-slate-500 mt-0.5">Pending</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-red-400">{highPriorityPending}</span>
          <span className="text-xs text-slate-500 mt-0.5">High priority</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-amber-400">{overdue}</span>
          <span className="text-xs text-slate-500 mt-0.5">Overdue</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-400">{done.length}</span>
          <span className="text-xs text-slate-500 mt-0.5">Completed</span>
        </div>
      </div>

      {/* Tasks left incomplete from a previous month — surfaced separately
          rather than silently mixed into (or dropped from) Today's Tasks,
          which is scoped to the current month */}
      {overduePending.length > 0 && (
        <Card title="Overdue" padding="p-3" action={<span className="text-xs text-red-400">{overduePending.length} from previous months</span>}>
          <ul className="space-y-1">
            {overduePending.map(task => <PendingTaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />)}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card
        title="Today's Tasks"
        padding="p-3"
        className="lg:col-span-3"
        action={<span className="text-xs text-slate-500">{thisMonthPending.length} remaining</span>}
      >
        {/* Add task row — wraps on narrow viewports (iPhone 16 Pro: 393px) instead of clipping the recurrence select */}
        <div className="flex flex-wrap gap-2 mb-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 min-w-[140px] bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
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

        {thisMonthPending.length === 0 && (
          <p className="text-sm text-slate-600 text-center py-6">No tasks this month — add one above</p>
        )}
        <ul className="space-y-1">
          {thisMonthPending.map(task => <PendingTaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />)}
        </ul>

        {done.length > 0 && (
          <details className="mt-4">
            <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none list-none">
              <span>›</span> Completed ({done.length})
            </summary>
            <ul className="space-y-1 mt-2">
              {done.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-surface-2 transition-colors group">
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

      <Card title="By Area" padding="p-3" className="lg:col-span-2">
        {areaEntries.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No pending tasks</p>
        ) : (
          <ul className="space-y-1.5">
            {areaEntries.map(([area, count]) => (
              <li key={area} className="py-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <p className="flex-1 text-sm text-slate-300 truncate">{area}</p>
                  <span className="text-xs text-slate-500 bg-surface-2 rounded-full px-2 py-0.5 shrink-0">{count}</span>
                </div>
                <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent/60 rounded-full" style={{ width: `${(count / pending.length) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </div>
  )
}
