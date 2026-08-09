'use client'

import { useState, useOptimistic, useTransition, useEffect } from 'react'
import { Trash2, Sparkles, ExternalLink, ListTodo } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import StatCard from '@/components/StatCard'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { addTask, toggleTask, deleteTask } from '../actions'
import { getExecutiveSummaryData, type ExecutiveSummaryData } from '@/features/brain/advisor'
import type { Task, Priority, Recurrence } from '../types'

function ExecutiveSummaryTrigger() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ExecutiveSummaryData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && !data && !loading) {
      setLoading(true)
      getExecutiveSummaryData().then(result => { setData(result); setLoading(false) })
    }
  }, [open, data, loading])

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full bg-accent-soft border border-accent-border text-accent-strong text-[12.5px] font-semibold hover:bg-accent/25 transition-colors">
        <span>◆</span> Executive Summary
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto bg-surface-1 border border-surface-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 fade-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 sticky top-0 bg-surface-1 z-10">
              <span className="text-sm font-bold text-fg-primary">◆ Executive Summary</span>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-fg-tertiary hover:text-fg-secondary text-base leading-none">✕</button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              {loading || !data ? (
                <div className="space-y-2">
                  {[90, 75, 85, 60, 95].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
                </div>
              ) : (
                <>
                  {data.scorecard.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2.5">This Week · Scorecard</p>
                      <div className="flex flex-col gap-2.5">
                        {data.scorecard.map(m => (
                          <div key={m.name}>
                            <div className="flex justify-between text-[12.5px] text-fg-primary mb-1">
                              <span>{m.name}</span><span>{m.value}</span>
                            </div>
                            <div className="h-[5px] rounded-[3px] bg-surface-3">
                              <div className="h-full rounded-[3px] bg-accent" style={{ width: `${m.value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[13px] leading-[1.6] text-fg-secondary border-t border-surface-3 pt-3.5">{data.reflection}</p>

                  {data.spendBreakdown.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2">Spend by Category</p>
                      <div className="flex flex-col gap-[5px]">
                        {data.spendBreakdown.map(s => (
                          <div key={s.name} className="flex justify-between text-[12.5px] text-fg-secondary">
                            <span>{s.name}</span><span>₹{Math.round(s.amount).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.recommendations.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2">Recommendations — every module</p>
                      <div className="flex flex-col gap-2">
                        {data.recommendations.map((r, i) => (
                          <div key={i} className="bg-surface-2 rounded-[8px] px-3 py-[9px] text-xs">
                            <span className="font-bold text-fg-primary">{r.emoji} {r.action}</span>{' '}
                            <span className="text-fg-secondary">— {r.impact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Raw CSS-var color values (not Tailwind classes) — design's task-row priority
// indicator is a plain colored uppercase text label, not a pill.
const priorityColorVar: Record<Priority, string> = {
  high: 'var(--risk)',
  medium: 'var(--warn)',
  low: 'var(--text-tertiary)',
}

// A task's "relevant month" is its due_date's month if set, else the month
// it was created in — so undated tasks implicitly belong to the month they
// were added, and roll into Overdue once that month passes uncompleted.
function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

function taskMeta(task: Task): string {
  const parts = [task.area]
  if (task.due_date) parts.push(`due ${task.due_date}`)
  if (task.recurrence) parts.push(`repeats ${task.recurrence}`)
  return parts.join(' · ')
}

function PendingTaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  return (
    <li className="flex items-center gap-3 bg-surface-2 rounded-[10px] px-3.5 py-2.5 group">
      <button
        onClick={() => onToggle(task.id, task.done)}
        aria-label="Mark task complete"
        className="w-[18px] h-[18px] rounded-[5px] shrink-0 cursor-pointer border-[1.5px] border-border-strong bg-transparent"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-fg-primary truncate">{task.text}</p>
        <p className="text-[11px] text-fg-tertiary mt-0.5 truncate">{taskMeta(task)}</p>
      </div>
      {task.external_url && (
        <a href={task.external_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="shrink-0 text-fg-quaternary hover:text-accent transition-colors">
          <ExternalLink size={13} />
        </a>
      )}
      <div className="shrink-0 text-[11px] font-bold uppercase tracking-[0.3px]" style={{ color: priorityColorVar[task.priority] }}>
        {task.priority}
      </div>
      <button onClick={() => onDelete(task.id)} aria-label="Delete task" className="shrink-0 opacity-0 group-hover:opacity-100 text-fg-quaternary hover:text-red-400 transition-all">
        <Trash2 size={13} />
      </button>
    </li>
  )
}

function CompletedTaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  return (
    <li className="flex items-center gap-3 bg-surface-2 rounded-[10px] px-3.5 py-2 opacity-70 group">
      <button
        onClick={() => onToggle(task.id, task.done)}
        aria-label="Mark task incomplete"
        className="w-[18px] h-[18px] rounded-[5px] shrink-0 cursor-pointer border-[1.5px] border-good bg-good"
      />
      <p className="flex-1 min-w-0 text-[13px] text-fg-tertiary line-through truncate">{task.text}</p>
      <button onClick={() => onDelete(task.id)} aria-label="Delete task" className="shrink-0 opacity-0 group-hover:opacity-100 text-fg-quaternary hover:text-red-400 transition-all">
        <Trash2 size={13} />
      </button>
    </li>
  )
}

interface Props {
  initialTasks: Task[]
}

type PlannerFilter = 'all' | 'high' | 'overdue' | `area:${string}`

export default function PlannerView({ initialTasks }: Props) {
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [area] = useState('General')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  const [isPending, startTransition] = useTransition()
  const [plannerFilter, setPlannerFilter] = useState<PlannerFilter>('all')

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

  const plannerFilterActive = plannerFilter !== 'all'
  const plannerFilterLabel = plannerFilter === 'high' ? 'High Priority' : plannerFilter === 'overdue' ? 'Overdue' : plannerFilter.startsWith('area:') ? plannerFilter.slice(5) : ''

  const visiblePending = plannerFilter === 'overdue' ? overduePending
    : plannerFilter === 'high' ? thisMonthPending.filter(t => t.priority === 'high')
    : plannerFilter.startsWith('area:') ? thisMonthPending.filter(t => t.area === plannerFilter.slice(5))
    : thisMonthPending

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
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[34px] font-bold tracking-[-0.02em] text-fg-primary">Planner</h1>
          <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">📋 {pending.length} pending</span>
          {overdue > 0 && (
            <span className="text-[11px] font-semibold bg-risk-soft rounded-full px-2.5 py-1 text-risk">🔴 {overdue} overdue</span>
          )}
        </div>
        <ExecutiveSummaryTrigger />
      </div>

      {/* Stats row — clickable filter tiles, except Completed (display-only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard value={pending.length} label="Pending" active={plannerFilter === 'all'} onClick={() => setPlannerFilter('all')} />
        <StatCard value={highPriorityPending} label="High priority" valueClassName="text-red-400" active={plannerFilter === 'high'} onClick={() => setPlannerFilter('high')} />
        <StatCard value={overdue} label="Overdue" valueClassName="text-amber-400" active={plannerFilter === 'overdue'} onClick={() => setPlannerFilter('overdue')} />
        <StatCard value={done.length} label="Completed" valueClassName="text-green-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
      <div className="lg:col-span-3 flex flex-col gap-3.5">
      <Card
        title="Today's Tasks"
        action={plannerFilterActive ? (
          <button onClick={() => setPlannerFilter('all')} className="bg-accent-soft rounded-[6px] px-2.5 py-1 text-[11px] text-accent-strong">
            Filter: {plannerFilterLabel} ✕
          </button>
        ) : <span className="text-xs text-fg-tertiary">{thisMonthPending.length} remaining</span>}
      >
        {/* Add task row — wraps on narrow viewports (iPhone 16 Pro: 393px) instead of clipping the recurrence select */}
        <div className="flex flex-wrap gap-2 mb-3.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 min-w-[140px] bg-surface-2 border border-surface-3 rounded-[8px] px-[11px] py-2 text-[12.5px] text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
          />
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as Priority)}
            className="bg-surface-2 border border-surface-3 rounded-[8px] px-2 py-2 text-xs text-fg-secondary outline-none focus:border-accent transition-colors"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={recurrence ?? ''}
            onChange={e => setRecurrence((e.target.value as Recurrence) || null)}
            className="bg-surface-2 border border-surface-3 rounded-[8px] px-2 py-2 text-xs text-fg-secondary outline-none focus:border-accent transition-colors"
          >
            <option value="">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={isPending || !input.trim()}
            className="px-3.5 py-2 rounded-[8px] bg-accent text-white text-[12.5px] font-semibold hover:bg-accent/80 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            + Add
          </button>
        </div>

        {visiblePending.length === 0 && (
          <div className="text-center py-[22px]">
            <div className="text-xl mb-1.5">✅</div>
            <p className="text-[13px] text-fg-tertiary">Nothing pending — add a task above.</p>
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {visiblePending.map(task => <PendingTaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />)}
        </ul>

        {done.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-fg-tertiary cursor-pointer select-none list-none">
              Completed ({done.length})
            </summary>
            <ul className="flex flex-col gap-1.5 mt-2">
              {done.map(task => (
                <CompletedTaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </ul>
          </details>
        )}
      </Card>

      {/* Tasks left incomplete from a previous month — surfaced separately
          rather than silently mixed into (or dropped from) Today's Tasks,
          which is scoped to the current month. Matches the design's
          risk-tinted banner chrome (not the generic Card wrapper). */}
      {overduePending.length > 0 && (
        <div className="rounded-[14px] bg-risk-soft border border-risk-border px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-risk-strong">Overdue</p>
            <span className="text-xs text-red-400">{overduePending.length} from previous months</span>
          </div>
          <ul className="flex flex-col gap-2">
            {overduePending.map(task => <PendingTaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />)}
          </ul>
        </div>
      )}
      </div>

      <Card title="By Area" className="lg:col-span-2">
        {areaEntries.length === 0 ? (
          <EmptyState icon={ListTodo} message="No pending tasks" compact />
        ) : (
          <ul className="flex flex-col gap-3">
            {areaEntries.map(([areaName, count]) => {
              const isActive = plannerFilter === `area:${areaName}`
              return (
                <li key={areaName}>
                  <button
                    onClick={() => setPlannerFilter(isActive ? 'all' : `area:${areaName}`)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[12.5px] mb-[5px]">
                      <span className={isActive ? 'font-bold text-accent' : 'font-normal text-fg-primary'}>{areaName}</span>
                      <span className="text-fg-tertiary">{count}</span>
                    </div>
                    <div className="h-[5px] rounded-[3px] bg-border">
                      <div className="h-full bg-accent rounded-[3px]" style={{ width: `${(count / pending.length) * 100}%` }} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      </div>
    </div>
  )
}
