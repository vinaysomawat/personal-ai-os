export type Todo = { id: string; title: string; done: boolean }
export type TodoMeta = { id: string; assignee: string; comments: number }
export type Filter = 'all' | 'active' | 'done'

const cache = new Map<string, Todo[]>()

export async function getTodos(filter: Filter): Promise<Todo[]> {
  if (cache.has('todos')) return cache.get('todos')!
  const res = await fetch(`/api/todos?filter=${filter}`)
  const todos: Todo[] = await res.json()
  cache.set('todos', todos)
  return todos
}

export async function getMeta(id: string): Promise<TodoMeta> {
  const res = await fetch(`/api/todos/${id}/meta`)
  return res.json()
}

export async function setDone(id: string, done: boolean): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  })
  return res.json()
}
