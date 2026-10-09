import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'

// AI interviewer critique of one Question Bank answer — shared by the web
// Question Bank (critiqueAnswer) and the Telegram voice drill. Plain module,
// not 'use server', so it isn't a publicly callable action.

const AI_NATIVE_SYSTEM = `You are a senior engineer interviewing a candidate for a Senior Frontend Engineer role at an AI-native company. The company's bar: engineers don't merely use AI for speed — they form their own hypotheses, pressure-test AI output, catch and explain AI mistakes, verify with evidence (tests, profiling, reading the code, reproducing), and take full ownership of final quality.
Grade one spoken answer against that bar. Reward: a concrete real example (tool, task, what went wrong or right), the candidate's own judgment leading rather than following the AI, explicit verification steps, trade-offs, and honest limits of AI. Penalize: generic "AI makes me faster" claims, no specific example, blind trust, vague verification ("I check it"), buzzwords.
Respond in plain text (no markdown headings), under 200 words, in exactly this shape:
Rating: <integer 1-10> — hiring bar for this level: 9-10 strong hire, 7-8 solid, 5-6 borderline, 3-4 weak, 1-2 no real answer
Verdict: <Strong / Good / Needs work> — <one sentence why>
What worked: <1-2 short points>
Fix next: <2-3 specific, actionable points>
Follow-up they'd ask: <one probing question that pressure-tests this answer>`

const BEHAVIORAL_SYSTEM = `You are a hiring manager interviewing a candidate for a Senior Frontend Engineer / Frontend Tech Lead role. The candidate was recently laid off and is answering a general or fit question.
Grade the spoken answer for: directness (answers the actual question in the first sentence), brevity (60–120 seconds spoken), concrete evidence (specific outcomes, numbers), fit with a senior/lead role, and tone (confident, no blame, no over-explaining — especially about the layoff or salary).
Respond in plain text (no markdown headings), under 180 words, in exactly this shape:
Rating: <integer 1-10> — hiring bar for this level: 9-10 strong hire, 7-8 solid, 5-6 borderline, 3-4 weak, 1-2 no real answer
Verdict: <Strong / Good / Needs work> — <one sentence why>
What worked: <1-2 short points>
Fix next: <2-3 specific, actionable points>
Follow-up they'd ask: <one natural follow-up question>`

const TECHNICAL_SYSTEM = `You are a senior frontend interviewer at a top product company. The candidate answered a frontend theory, UI-coding design, or frontend system-design question out loud and typed their answer.
Grade for technical correctness first (call out anything wrong), then depth (the why, not just the what), trade-offs, and what a senior candidate would add (performance, accessibility, testing, edge cases). If the question lists key points, check which are missing.
Respond in plain text (no markdown headings), under 200 words, in exactly this shape:
Rating: <integer 1-10> — hiring bar for this level: 9-10 strong hire, 7-8 solid, 5-6 borderline, 3-4 weak, 1-2 no real answer
Verdict: <Strong / Good / Needs work> — <one sentence why>
Correct / missing: <what was right, what was wrong or missing>
Fix next: <2-3 specific points to add>
Follow-up they'd ask: <one probing follow-up question>`

// Uncached (every answer differs); the 1–10 rating is parsed off the first
// line. `note` adds rubric context (e.g. "this answer was spoken").
export async function critiqueQuestion(db: SupabaseClient, userId: string, questionId: string, answer: string, note = ''): Promise<{ rating: number | null; feedback: string }> {
  const { data: q } = await db.from('coding_questions').select('title, answer_hints, category').eq('id', questionId).single()
  if (!q) throw new Error('Question not found')
  const hints = q.answer_hints ? `\nKey points a strong answer covers: ${q.answer_hints}` : ''
  const prompt = `Interview question: ${q.title}${hints}${note ? `\n\n${note}` : ''}\n\nCandidate's answer:\n${answer}`
  const raw = q.category === 'ai-native'
    ? await askAI('ai_native_critique', prompt, AI_NATIVE_SYSTEM, { userId })
    : await askAI('answer_critique', prompt, q.category === 'behavioral' ? BEHAVIORAL_SYSTEM : TECHNICAL_SYSTEM, { userId })
  const m = raw.match(/^\s*Rating:\s*(\d{1,2})(?:\s*\/\s*10)?[^\n]*\n?/i)
  const n = m ? Number(m[1]) : NaN
  return { rating: Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : null, feedback: m ? raw.slice(m[0].length).trim() : raw }
}
