import { useState } from 'react'
import { Plus, CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import Card from '../components/Card'

type Priority = 'high' | 'medium' | 'low'

interface Task {
  id: number
  text: string
  done: boolean
  priority: Priority
  area: string
}

const initial: Task[] = [
  { id: 1, text: 'Review system design notes', done: false, priority: 'high', area: 'Learning' },
  { id: 2, text: 'Update resume with latest project', done: false, priority: 'high', area: 'Career' },
  { id: 3, text: 'Log yesterday\'s workout', done: true, priority: 'medium', area: 'Health' },
  { id: 4, text: 'Pay credit card bill', done: false, priority: 'medium', area: 'Finance' },
  { id: 5, text: 'Push AI OS commit', done: true, priority: 'low', area: 'Coding' },
]

const priorityColor: Record<Priority, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-slate-500',
}

const priorityDot: Record<Priority, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

export default function Planner() {
  const [tasks, setTasks] = useState<Task[]>(initial)
  const [input, setInput] = useState('')

  const toggle = (id: number) =>
    setTasks(t => t.map(task => (task.id === id ? { ...task, done: !task.done } : task)))

  const addTask = () => {
    if (!input.trim()) return
    setTasks(t => [...t, { id: Date.now(), text: input.trim(), done: false, priority: 'medium', area: 'General' }])
    setInput('')
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div className="space-y-5">
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

      <Card title="Today's Tasks" action={
        <span className="text-xs text-slate-500">{pending.length} remaining</span>
      }>
        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Add a task..."
            className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={addTask}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <ul className="space-y-1.5">
          {pending.map(task => (
            <li
              key={task.id}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group cursor-pointer"
              onClick={() => toggle(task.id)}
            >
              <Circle size={16} className="text-slate-600 group-hover:text-accent transition-colors shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{task.text}</p>
                <p className="text-xs text-slate-600">{task.area}</p>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${priorityDot[task.priority]}`} />
            </li>
          ))}
        </ul>

        {done.length > 0 && (
          <details className="mt-4">
            <summary className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none list-none">
              <ChevronRight size={12} className="transition-transform details-open:rotate-90" />
              Completed ({done.length})
            </summary>
            <ul className="space-y-1.5 mt-2">
              {done.map(task => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
                  onClick={() => toggle(task.id)}
                >
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <p className="text-sm text-slate-500 line-through">{task.text}</p>
                  <span className={`ml-auto text-xs ${priorityColor[task.priority]}`}>{task.area}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    </div>
  )
}
