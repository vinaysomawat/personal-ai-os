'use server'

import { askAI } from '@/lib/ai-gateway'
import type { CodingQuestion, WeakArea } from '@/features/coding/daily-core'

interface CodingContext {
  recentSolved: string[]
  currentStreakDays: number
}

export async function askCodingMentor(question: string, ctx: CodingContext): Promise<string> {
  const context = `Vinay's coding practice snapshot:
- Current daily-question streak: ${ctx.currentStreakDays} day(s)
- Recently solved: ${ctx.recentSolved.length ? ctx.recentSolved.join(', ') : 'none yet'}

Question: ${question}`

  return askAI('coding_mentor', context, `You are Vinay's coding mentor. He's a frontend/testing engineer targeting senior+ roles (JS/TS/React/Next.js, system design, AI-assisted dev).
Give sharp, concrete answers — explain concepts with a short example when useful, or point out the pattern behind a problem rather than just the answer.
Under 200 words. No generic platitudes.`)
}

// Ranks/selects from the EXISTING question pool passed in as `candidates` —
// never invents a question, title, or URL. The pool this is called with is
// already deterministically pre-filtered (topic overlap with weak areas /
// company priority topics, not already completed) before it ever reaches
// the model — this call's only job is picking and ordering the best few
// from that pre-narrowed set, with a one-line reason each, per "quality
// over quantity."
export async function recommendCodingQuestions(
  candidates: CodingQuestion[],
  weakAreas: WeakArea[],
  company: { company: string; topics: string[] } | null,
  goalsContext = ''
): Promise<{ questionId: string; reason: string }[]> {
  if (candidates.length === 0) return []

  const prompt = `Vinay is a frontend engineer targeting senior/staff roles, practicing for technical interviews.

Weak areas (topics he's struggled with across multiple questions, worst first):
${weakAreas.length ? weakAreas.map(w => `- ${w.topic}: struggled on ${w.strugglingCount}/${w.total} attempts`).join('\n') : 'None identified yet — not enough history.'}

${company ? `He has an active application at ${company.company}. Its job description flagged these priority topics: ${company.topics.join(', ')}.` : 'No active application with analyzed priority topics right now.'}${goalsContext}

Candidate questions (already filtered to ones he hasn't solved, each with its id, title, difficulty, and tagged topics):
${candidates.map(c => `- id="${c.id}" | ${c.title} | ${c.difficulty} | topics: ${(c.topics ?? []).join(', ') || 'none'}`).join('\n')}

Pick the 3-5 BEST questions from this exact candidate list for him to practice next — prioritize his weak areas, the company's priority topics if given, his active goals if listed, and your knowledge of what's currently frequently asked in frontend interviews at top product companies. Quality over quantity: fewer, sharper picks beat a long list.

Return ONLY a JSON array in this exact format, ordered best-first:
[
  {"questionId": "...", "reason": "..."},
  ...
]

questionId MUST be copied exactly from the candidate list's id values — never invent one. reason is one sentence explaining why this question, now.`

  const raw = await askAI('recommend_coding_questions', prompt, 'You are a sharp technical interview coach. Return only valid JSON, no explanation, no markdown fences. Only select from the exact candidate ids given — never invent a question.')
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) : []
    const validIds = new Set(candidates.map(c => c.id))
    return (parsed as { questionId: string; reason: string }[]).filter(p => validIds.has(p.questionId))
  } catch {
    return []
  }
}
