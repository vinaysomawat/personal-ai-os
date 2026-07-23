import type { QuizAttempt, QuizQuestion, ReadinessTier } from './types'

// Deterministic grading — Product Principle 2 (rule engine before AI). The AI
// only generates questions/correct answers/explanations; comparing the
// candidate's picks against them is plain code, not a model call.
export function gradeQuiz(questions: QuizQuestion[], userAnswers: number[]): { score: number; weakAreas: string[] } {
  let score = 0
  const weakAreas = new Set<string>()
  questions.forEach((q, i) => {
    if (userAnswers[i] === q.correctIndex) score++
    else weakAreas.add(q.subtopic)
  })
  return { score, weakAreas: [...weakAreas] }
}

// Recency-weighted average of the last 3 attempts for a topic — most recent
// counts most, so a recent strong run shows up quickly without fully erasing
// a rougher history right before it.
export function computeReadiness(attempts: QuizAttempt[], topic: string): { tier: ReadinessTier; avgPercent: number | null } {
  const topicAttempts = attempts
    .filter(a => a.topic === topic)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3)

  if (topicAttempts.length === 0) return { tier: 'not_started', avgPercent: null }

  const weights = [3, 2, 1]
  let weightedSum = 0
  let weightTotal = 0
  topicAttempts.forEach((a, i) => {
    weightedSum += (a.score / a.total) * 100 * weights[i]
    weightTotal += weights[i]
  })
  const avgPercent = Math.round(weightedSum / weightTotal)

  const tier: ReadinessTier =
    avgPercent >= 80 ? 'strong' :
    avgPercent >= 60 ? 'ready' :
    avgPercent >= 40 ? 'developing' : 'needs_work'

  return { tier, avgPercent }
}

// Fallback "what next" ranking for when you ignore the AI's trend-aware
// banner — lowest readiness first (never-attempted topics sort first of
// all), ties broken by whichever topic has gone longest without a fresh attempt.
export function suggestNextTopic(attempts: QuizAttempt[], topics: readonly string[]): string {
  const scored = topics.map(topic => {
    const { avgPercent } = computeReadiness(attempts, topic)
    const lastAttempt = attempts
      .filter(a => a.topic === topic)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
    return {
      topic,
      score: avgPercent ?? -1,
      lastAttemptTime: lastAttempt ? new Date(lastAttempt.created_at).getTime() : 0,
    }
  })
  scored.sort((a, b) => a.score - b.score || a.lastAttemptTime - b.lastAttemptTime)
  return scored[0].topic
}

// Most frequent weak subtopic across recent attempts — mirrors Coding's
// computeWeakAreas (min-sample-2 + worst-first), applied to Career's own
// per-question subtopic tags instead of per-question topics.
export function topWeakSubtopic(attempts: { weak_areas: string[] }[], minSample = 2): { subtopic: string; count: number } | null {
  const counts = new Map<string, number>()
  for (const a of attempts) {
    for (const subtopic of a.weak_areas) {
      counts.set(subtopic, (counts.get(subtopic) ?? 0) + 1)
    }
  }
  const [top] = [...counts.entries()].filter(([, count]) => count >= minSample).sort((a, b) => b[1] - a[1])
  return top ? { subtopic: top[0], count: top[1] } : null
}

// Deterministic, not AI — same 14-day idle-rule shape as the old QA revision
// nudge, now anchored on "days since any quiz attempt" rather than per-item review.
export function daysSinceLastQuiz(attempts: { created_at: string }[]): number | null {
  if (attempts.length === 0) return null
  const latest = attempts.reduce((max, a) => (a.created_at > max ? a.created_at : max), attempts[0].created_at)
  return Math.floor((Date.now() - new Date(latest).getTime()) / 86400000)
}
