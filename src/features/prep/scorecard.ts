// AI review scorecard (Question Bank answers, Story Bank rehearsals) — types
// and labels shared by the server grader (critique.ts) and the client review
// card (AnswerReview).

export type Rubric = 'technical' | 'behavioral' | 'ai-native' | 'story' | 'code-review'
export type PointStatus = 'covered' | 'partial' | 'missing'

export interface Scorecard {
  rubric: Rubric
  verdict: 'Strong' | 'Good' | 'Needs work'
  summary: string
  points: { point: string; status: PointStatus; note: string }[]
  correctness: 0 | 1 | 2
  depth: 0 | 1 | 2
  clarity: 0 | 1
  fixes: string[]
  followUp: string
}

// Labels for the three criterion scores, per rubric (UI + Telegram text).
export const CRITERIA: Record<Rubric, { correctness: string; depth: string; clarity: string }> = {
  technical: { correctness: 'Correctness', depth: 'Depth', clarity: 'Clarity' },
  behavioral: { correctness: 'No red flags', depth: 'Evidence', clarity: 'Direct & concise' },
  'ai-native': { correctness: 'Judgment', depth: 'Real example', clarity: 'Clarity' },
  story: { correctness: 'Own contribution', depth: 'Evidence', clarity: 'Concise' },
  'code-review': { correctness: 'Findings correct', depth: 'Severity & prioritization', clarity: 'Fix quality' },
}
