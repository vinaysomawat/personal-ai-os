import { useEffect, useState } from 'react'
import { getMeta, getTodos, setDone, type Filter, type Todo, type TodoMeta } from './api'

export function App() {
  const [filter, setFilter] = useState<Filter>('all')
  const [todos, setTodos] = useState<Todo[]>([])
  const [meta, setMeta] = useState<Record<string, TodoMeta>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const list = await getTodos(filter)
      if (cancelled) return
      setTodos(list)
      setLoading(false)
      for (const t of list) {
        const m = await getMeta(t.id)
        if (cancelled) return
        setMeta(prev => ({ ...prev, [t.id]: m }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [filter])

  function toggle(todo: Todo) {
    setTodos(prev => prev.map(t => (t.id === todo.id ? { ...t, done: !t.done } : t)))
    setDone(todo.id, !todo.done)
  }

  return (
    <main>
      <h1>Team todos</h1>
      <div className="filters">
        {(['all', 'active', 'done'] as Filter[]).map(f => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {loading ? <p>Loading…</p> : (
        <ul>
          {todos.map(t => (
            <li key={t.id}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} aria-label={t.title} />
              <span className={t.done ? 'done' : ''}>{t.title}</span>
              <span className="meta">{meta[t.id] ? `${meta[t.id].assignee} · ${meta[t.id].comments} comments` : '…'}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
