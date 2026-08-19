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

// Surfaces the best new job-alert lead (score >= 70, "Top Fit" — see
// job-alerts.ts's deterministic computeScore) that isn't already tracked as
// an application. Only the single best one fires the signal — the full list
// lives on the Career page's Job Alerts card.
export function checkHighValueJobAlert(topAlert: { company: string; title: string } | null): Signal | null {
  if (!topAlert) return null
  return {
    id: 'career.high_value_job_alert', module: 'career', weight: 55, emoji: '💼', href: '/career',
    message: `Top-fit opening at ${topAlert.company}: ${topAlert.title}`,
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
