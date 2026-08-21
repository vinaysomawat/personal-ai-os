'use server'

import { askAI } from '@/lib/ai-gateway'
import { getActiveCompanyPriorityTopics, getInsightsHistory } from '@/features/coding/daily'
import { computeWeakAreas } from '@/features/coding/daily-core'
import type { Resource, RecommendedResource, QuizQuestion } from '@/features/learning/types'

export async function getDailyStudyPlan(resources: Resource[]): Promise<string> {
  const inProgress = resources.filter(r => r.status === 'in-progress')
  const completed = resources.filter(r => r.status === 'completed')
  const notStarted = resources.filter(r => r.status === 'not-started')

  if (inProgress.length === 0 && notStarted.length === 0) {
    return "You've completed everything in your list! Add new resources to keep the momentum going."
  }

  const prompt = `Vinay's learning resources:

In progress (${inProgress.length}):
${inProgress.map(r => `- ${r.title} (${r.type}, ${r.category}) — ${r.progress}% done${r.notes ? ` — "${r.notes}"` : ''}`).join('\n') || 'none'}

Not started (${notStarted.length}):
${notStarted.slice(0, 5).map(r => `- ${r.title} (${r.type}, ${r.category})`).join('\n') || 'none'}

Completed: ${completed.length} resources

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

// Fallback for the daily-read pick once the curated pool (reading-articles.ts)
// is exhausted for what's already in the resource list. Deliberately has no
// `url` — same anti-hallucination stance as recommendResources above; the
// linked Planner task text alone ("Read: {title}") is enough to go find it.
export async function recommendDailyRead(resources: Resource[]): Promise<{ title: string; category: string; reason: string; estimatedMinutes: number } | null> {
  const completedTitles = resources.filter(r => r.status === 'completed').map(r => r.title)
  const existingTitles = resources.map(r => r.title)

  const prompt = `Vinay is a frontend engineer targeting senior/staff-level roles, building a daily reading habit — one short technical article per day.

Already read or in his list — do NOT suggest any of these again: ${existingTitles.join(', ') || 'none'}
Recently completed: ${completedTitles.slice(0, 10).join(', ') || 'none'}

Suggest ONE real, well-known frontend/web-engineering article, guide, or blog post he should read today. Requirements:
1. Must be a real, specific, well-known piece by its actual title (a specific blog post, official docs page, or well-cited article) — never invent a plausible-sounding title for something that doesn't exist.
2. Should take roughly 30-60 minutes to read. If the best fit is genuinely longer, say so honestly in the reason and note it can be split across a couple of sessions — don't undersell its length to fit the window.
3. Prefer something that fills a real gap versus what he's already read above, or is currently relevant to frontend interview trends/ecosystem shifts.

Return ONLY a JSON object in this exact format:
{"title": "...", "category": "...", "reason": "...", "estimatedMinutes": 45}

Do NOT include a "url" field.`

  const raw = await askAI('recommend_daily_read', prompt, 'You are a sharp technical mentor who stays current on frontend engineering writing. Return only valid JSON, no explanation, no markdown fences. Never invent a fake article title.')
  try {
    const parsed = JSON.parse(raw)
    return parsed.title ? parsed : null
  } catch {
    return null
  }
}

// Graded multiple-choice quiz (was ungraded question/answer flashcards) —
// scoring is what lets weak areas be identified per category (Learning
// Stage: mandatory quiz gate on marking a resource "Completed").
export async function generateResourceQuiz(title: string, category: string, type: string, notes: string | null): Promise<QuizQuestion[]> {
  const prompt = `Generate a comprehension quiz on: "${title}" (${type}, category: ${category})${notes ? `\nContext: ${notes}` : ''}

10 multiple-choice questions testing real understanding of this specific resource's material, not generic trivia about the category.

Return ONLY a JSON array in this exact format:
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 0,
    "explanation": "...",
    "subtopic": "..."
  },
  ...
]

Rules:
- Exactly 4 options per question, only one correct.
- correctIndex is the 0-based index of the correct option.
- explanation is 1-2 sentences explaining why the correct answer is right.
- subtopic is a short 2-4 word label for the specific concept this question tests (used to identify weak areas later), e.g. "Closures", "Event Loop".
- Mix conceptual, applied, and comparison questions.
- If a question needs a code snippet, write it inline as plain text — do NOT use markdown code fences, the UI renders this as plain text.`

  const raw = await askAI('resource_quiz', prompt, 'You are a knowledgeable tutor writing a comprehension quiz. Return only valid JSON, no extra text, no markdown fences.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}
