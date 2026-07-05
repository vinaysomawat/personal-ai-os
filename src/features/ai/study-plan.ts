'use server'

import { aiText } from '@/lib/anthropic'
import type { Resource, StudyLog } from '@/features/learning/types'

export async function getDailyStudyPlan(resources: Resource[], recentLogs: StudyLog[]): Promise<string> {
  const inProgress = resources.filter(r => r.status === 'in-progress')
  const completed = resources.filter(r => r.status === 'completed')
  const notStarted = resources.filter(r => r.status === 'not-started')

  if (inProgress.length === 0 && notStarted.length === 0) {
    return "You've completed everything in your list! Add new resources to keep the momentum going."
  }

  const studiedToday = recentLogs
    .filter(l => l.date === new Date().toISOString().split('T')[0])
    .map(l => resources.find(r => r.id === l.resource_id)?.title ?? 'Unknown')

  const prompt = `Vinay's learning resources:

In progress (${inProgress.length}):
${inProgress.map(r => `- ${r.title} (${r.type}, ${r.category}) — ${r.progress}% done${r.notes ? ` — "${r.notes}"` : ''}`).join('\n') || 'none'}

Not started (${notStarted.length}):
${notStarted.slice(0, 5).map(r => `- ${r.title} (${r.type}, ${r.category})`).join('\n') || 'none'}

Completed: ${completed.length} resources
Studied today already: ${studiedToday.length ? studiedToday.join(', ') : 'nothing yet'}

Create a focused study plan for today. Include:
1. **Main focus** (60 min): which resource, what specifically to cover
2. **Quick review** (15 min): something to revise from recent learning
3. **Optional** (if time): one thing to start or explore

Be specific — reference actual resource names and chapters/topics. Keep it under 150 words.`

  return aiText(prompt, "You are Vinay's personal study coach. Create sharp, specific daily plans. Reference his actual resources by name.")
}

export async function generateResourceQuiz(title: string, category: string, type: string, notes: string | null): Promise<{ question: string; answer: string }[]> {
  const prompt = `Generate 5 comprehension questions for: "${title}" (${type}, category: ${category})${notes ? `\nContext: ${notes}` : ''}

Return ONLY a JSON array:
[
  {"question": "...", "answer": "..."},
  ...
]

Questions should test real understanding, not just trivia. Mix conceptual, applied, and comparison questions. Answers in 2-3 sentences.`

  const raw = await aiText(prompt, 'You are a knowledgeable tutor. Return only valid JSON, no extra text.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
