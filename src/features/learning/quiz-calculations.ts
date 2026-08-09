import type { QuizQuestion, ResourceQuizAttempt } from './types'

// Deterministic grading — Product Principle 2 (rule engine before AI). The AI
// only generates questions/correct answers/explanations; comparing the
// user's picks against them is plain code, not a model call. Same shape as
// Career's gradeQuiz.
export function gradeQuiz(questions: QuizQuestion[], userAnswers: number[]): { score: number; weakAreas: string[] } {
  let score = 0
  const weakAreas = new Set<string>()
  questions.forEach((q, i) => {
    if (userAnswers[i] === q.correctIndex) score++
    else weakAreas.add(q.subtopic)
  })
  return { score, weakAreas: [...weakAreas] }
}

export interface CategoryWeakArea {
  category: string
  attempts: number
  avgPercent: number
}

// Average score per category across all quiz attempts, worst-first — same
// "min-sample, worst-first" shape as Coding's computeWeakAreas, applied to
// Learning's per-category quiz history instead of per-topic coding attempts.
export function computeCategoryWeakAreas(attempts: ResourceQuizAttempt[], minSample = 1): CategoryWeakArea[] {
  const byCategory = new Map<string, ResourceQuizAttempt[]>()
  for (const a of attempts) {
    const list = byCategory.get(a.category) ?? []
    list.push(a)
    byCategory.set(a.category, list)
  }

  return [...byCategory.entries()]
    .map(([category, categoryAttempts]) => {
      const avgPercent = Math.round(
        categoryAttempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / categoryAttempts.length
      )
      return { category, attempts: categoryAttempts.length, avgPercent }
    })
    .filter(c => c.attempts >= minSample)
    .sort((a, b) => a.avgPercent - b.avgPercent)
}
