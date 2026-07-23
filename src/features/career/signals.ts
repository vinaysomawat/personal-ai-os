import type { Signal } from '@/lib/signals'

interface ApplicationLike {
  status: string
}

export function checkQuizWeakArea(topWeak: { subtopic: string; count: number } | null): Signal | null {
  if (!topWeak) return null
  return {
    id: 'career.quiz_weak_area', module: 'career', weight: 48, emoji: '🧩', href: '/career',
    message: `"${topWeak.subtopic}" has come up as a weak area in ${topWeak.count} quizzes — worth a focused review`,
  }
}

export function checkInterviewStage(applications: ApplicationLike[]): Signal | null {
  const interviewApps = applications.filter(a => a.status === 'interview')
  if (interviewApps.length === 0) return null
  return {
    id: 'career.interview_stage', module: 'career', weight: 90, emoji: '🎯', href: '/career',
    message: `${interviewApps.length} application${interviewApps.length > 1 ? 's' : ''} at interview stage — prep now`,
  }
}

export function checkQuizNeedsRevision(daysSinceLastQuiz: number | null): Signal | null {
  if (daysSinceLastQuiz === null) {
    return {
      id: 'career.quiz_needs_revision', module: 'career', weight: 42, emoji: '🧠', href: '/career',
      message: 'Take your first interview prep quiz',
    }
  }
  if (daysSinceLastQuiz < 14) return null
  return {
    id: 'career.quiz_needs_revision', module: 'career', weight: 42, emoji: '🧠', href: '/career',
    message: `No interview prep quiz in ${daysSinceLastQuiz}+ days — keep skills sharp`,
  }
}
