'use server'

import { askAI } from '@/lib/ai-gateway'
import type { QuizQuestion } from '@/features/career/types'

export async function generateTopicQuiz(topic: string, difficulty: string, weakAreas: string[]): Promise<QuizQuestion[]> {
  const weakAreaHint = weakAreas.length > 0
    ? `\n\nThe candidate has previously struggled with: ${weakAreas.join(', ')}. Weight a couple of questions toward these subtopics.`
    : ''

  const prompt = `Generate a ${difficulty} difficulty interview-prep quiz on "${topic}" for a Senior/Staff Frontend Engineer candidate. 10 multiple-choice questions.${weakAreaHint}

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
- subtopic is a short 2-4 word label for what specific concept this question tests (used to identify weak areas later), e.g. "Closures", "Event Loop", "React Reconciliation".
- Questions should be realistic, specific, and at the stated difficulty — not generic trivia.
- If a question needs a code snippet, write it inline as plain text (e.g. "what does \`const x = 1; x = 2\` do") — do NOT use markdown triple-backtick code fences or code blocks, since the UI renders this as plain text with no markdown formatting.`

  const raw = await askAI('generate_topic_quiz', prompt, 'You are a senior engineering interviewer writing a technical screening quiz. Return only valid JSON, no explanation, no markdown fences.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

interface TopicReadiness {
  topic: string
  tier: string
  avgPercent: number | null
  daysSinceLastAttempt: number | null
}

export async function recommendQuizTopic(readinessByTopic: TopicReadiness[], targetRole: string | null): Promise<{ topic: string; reason: string } | null> {
  const summary = readinessByTopic.map(r =>
    `${r.topic}: ${r.tier}${r.avgPercent !== null ? ` (${r.avgPercent}%)` : ''}, ${r.daysSinceLastAttempt === null ? 'never attempted' : `last attempted ${r.daysSinceLastAttempt}d ago`}`
  ).join('\n')

  const prompt = `Candidate's target role: ${targetRole ?? 'Senior/Staff Frontend Engineer'}

Quiz readiness by topic:
${summary}

Based on the candidate's actual readiness above AND your knowledge of current frontend interview trends (what's most frequently asked at top product companies right now), pick the ONE topic they should study next.

Return ONLY a JSON object in this exact format:
{"topic": "<one of the topics listed above, exact match>", "reason": "<one sentence, specific, referencing both their readiness and why this topic matters right now>"}`

  const raw = await askAI('recommend_quiz_topic', prompt, 'You are a sharp technical interview coach who stays current on frontend hiring trends. Return only valid JSON, no explanation, no markdown fences.')
  try {
    const parsed = JSON.parse(raw)
    return parsed.topic ? parsed : null
  } catch {
    return null
  }
}
