'use server'

import { askAI } from '@/lib/ai-gateway'
import { todayIST } from '@/lib/date'
import { getActiveCompanyPriorityTopics, getInsightsHistory } from '@/features/coding/daily'
import { computeWeakAreas } from '@/features/coding/daily-core'
import type { Resource, StudyLog, RecommendedResource } from '@/features/learning/types'

export async function getDailyStudyPlan(resources: Resource[], recentLogs: StudyLog[]): Promise<string> {
  const inProgress = resources.filter(r => r.status === 'in-progress')
  const completed = resources.filter(r => r.status === 'completed')
  const notStarted = resources.filter(r => r.status === 'not-started')

  if (inProgress.length === 0 && notStarted.length === 0) {
    return "You've completed everything in your list! Add new resources to keep the momentum going."
  }

  const studiedToday = recentLogs
    .filter(l => l.date === todayIST())
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

  return askAI('study_plan', prompt, "You are Vinay's personal study coach. Create sharp, specific daily plans. Reference his actual resources by name.")
}

export async function recommendResources(resources: Resource[], excludeTitles: string[]): Promise<RecommendedResource[]> {
  const inProgress = resources.filter(r => r.status === 'in-progress')
  const completed = resources.filter(r => r.status === 'completed')
  const categories = [...new Set(resources.map(r => r.category))]

  // Cross-module signals (Product Principle 4) — Career's active JD priority
  // topics and Coding's weak areas, the same two signals Coding's own
  // recommender already uses, reused here rather than recomputed differently.
  const [company, codingHistory] = await Promise.all([getActiveCompanyPriorityTopics(), getInsightsHistory()])
  const codingWeakAreas = computeWeakAreas(codingHistory).map(w => w.topic)

  const prompt = `Vinay is a frontend engineer targeting senior/staff-level roles. His current learning:

Categories he's studying: ${categories.join(', ') || 'none yet'}
In progress (${inProgress.length}): ${inProgress.map(r => `${r.title} (${r.category})`).join(', ') || 'none'}
Completed (${completed.length}): ${completed.map(r => r.title).join(', ') || 'none'}

Already suggested or in his list — do NOT recommend any of these again: ${excludeTitles.join(', ') || 'none'}
${company ? `\nHe has an active application at ${company.company}. Its job description flagged these priority topics: ${company.topics.join(', ')}.` : ''}
${codingWeakAreas.length ? `\nHe's been struggling with these topics in coding practice: ${codingWeakAreas.join(', ')}.` : ''}

Recommend 5 learning resources he should study next. Base this on:
1. His actual progress above — fill real gaps, don't repeat what he already knows or is doing.
2. The active application's priority topics and coding weak areas above, if any — these are his highest-signal gaps to close.
3. Your knowledge of current frontend interview trends and what's frequently asked at top product companies right now.
4. Recent frontend/JS ecosystem developments worth knowing.

Order them by priority — the most important one first, with the reason explaining why it matters right now (interview relevance, ecosystem shift, or gap in his current progress).

Return ONLY a JSON array in this exact format:
[
  {"title": "...", "type": "course"|"book"|"video"|"article"|"podcast", "category": "...", "reason": "..."},
  ...
]

Do NOT include a "url" field — specific links aren't reliable from you. title should name a real, well-known resource (a specific book, a well-known course platform's course, a commonly-cited article/talk) by its actual name, not a generic placeholder — but never fabricate a URL for it.`

  const raw = await askAI('recommend_resources', prompt, 'You are a sharp technical mentor who stays current on frontend interview trends and the JS ecosystem. Return only valid JSON, no explanation, no markdown fences. Never invent a URL.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function generateResourceQuiz(title: string, category: string, type: string, notes: string | null): Promise<{ question: string; answer: string }[]> {
  const prompt = `Generate 5 comprehension questions for: "${title}" (${type}, category: ${category})${notes ? `\nContext: ${notes}` : ''}

Return ONLY a JSON array:
[
  {"question": "...", "answer": "..."},
  ...
]

Questions should test real understanding, not just trivia. Mix conceptual, applied, and comparison questions. Answers in 2-3 sentences.`

  const raw = await askAI('resource_quiz', prompt, 'You are a knowledgeable tutor. Return only valid JSON, no extra text.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
