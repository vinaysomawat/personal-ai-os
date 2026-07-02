'use server'

import { aiText } from '@/lib/anthropic'
import type { Task } from '@/features/planner/types'

export async function smartSortTasks(tasks: Task[]): Promise<string[]> {
  if (tasks.length === 0) return []

  const prompt = `Sort these tasks by priority considering urgency, importance, and deadline.
Return ONLY a JSON array of task IDs in the recommended order (highest priority first). No explanation.

Tasks:
${tasks.map(t => `{"id":"${t.id}","text":"${t.text}","priority":"${t.priority}","due_date":"${t.due_date ?? 'none'}","area":"${t.area}"}`).join('\n')}

Respond with only a JSON array like: ["id1","id2","id3"]`

  const raw = await aiText(prompt)
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return tasks.map(t => t.id)
  try {
    return JSON.parse(match[0]) as string[]
  } catch {
    return tasks.map(t => t.id)
  }
}

export async function getFocusTask(tasks: Task[]): Promise<string> {
  if (tasks.length === 0) return ''
  const pending = tasks.filter(t => !t.done).slice(0, 10)
  if (pending.length === 0) return ''

  const prompt = `Given these pending tasks, pick the single most important one to focus on right now and explain why in one sentence.

Tasks:
${pending.map(t => `- [${t.priority}] ${t.text}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n')}

Reply with: "Focus on: <task text> — <one-sentence reason>"`

  return aiText(prompt)
}
