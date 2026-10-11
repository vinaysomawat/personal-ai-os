import express from 'express'
import { randomUUID } from 'node:crypto'

// In-memory todo API with realistic latency. PATCH fails for any todo whose
// title contains "flaky" — the backend team says that's "expected for now".
const app = express()
app.use(express.json())

const sleep = ms => new Promise(r => setTimeout(r, ms))
const TITLES = [
  'Write release notes', 'Fix flaky checkout test', 'Review Priya\'s PR', 'Update onboarding docs',
  'Rotate API keys', 'Plan Q3 roadmap', 'Pair with Ben on caching', 'Triage bug backlog',
  'Book design review', 'Upgrade to React 19', 'Clean up feature flags', 'Write postmortem',
]
const todos = TITLES.map((title, i) => ({ id: String(i + 1), title, done: i % 3 === 0 }))
const PEOPLE = ['Asha', 'Ben', 'Chen', 'Divya']

app.get('/api/todos', async (req, res) => {
  await sleep(250)
  const filter = req.query.filter ?? 'all'
  res.json(todos.filter(t => filter === 'all' || (filter === 'done' ? t.done : !t.done)))
})

app.get('/api/todos/:id/meta', async (req, res) => {
  await sleep(150)
  const n = Number(req.params.id)
  res.json({ id: req.params.id, assignee: PEOPLE[n % PEOPLE.length], comments: (n * 7) % 5 })
})

app.post('/api/todos', async (req, res) => {
  await sleep(300)
  const todo = { id: req.body.id ?? randomUUID(), title: String(req.body.title ?? '').slice(0, 200), done: false }
  todos.push(todo)
  res.status(201).json(todo)
})

app.patch('/api/todos/:id', async (req, res) => {
  await sleep(400)
  const todo = todos.find(t => t.id === req.params.id)
  if (!todo) return res.status(404).json({ error: 'Not found' })
  if (todo.title.toLowerCase().includes('flaky')) return res.status(500).json({ error: 'Upstream timeout' })
  if (typeof req.body.done === 'boolean') todo.done = req.body.done
  if (typeof req.body.title === 'string') todo.title = req.body.title.slice(0, 200)
  res.json(todo)
})

app.listen(3002, () => console.log('todo API on http://localhost:3002'))
