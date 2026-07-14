import type { Signal } from '@/lib/signals'

interface ApplicationLike {
  status: string
}

export function checkInterviewStage(applications: ApplicationLike[]): Signal | null {
  const interviewApps = applications.filter(a => a.status === 'interview')
  if (interviewApps.length === 0) return null
  return {
    id: 'career.interview_stage', module: 'career', weight: 90, emoji: '🎯', href: '/career',
    message: `${interviewApps.length} application${interviewApps.length > 1 ? 's' : ''} at interview stage — prep now`,
  }
}

export function checkQANeedsRevision(count: number): Signal | null {
  if (count === 0) return null
  return {
    id: 'career.qa_needs_revision', module: 'career', weight: 42, emoji: '🧠', href: '/career',
    message: `${count} interview Q&A${count > 1 ? 's' : ''} not revisited in 14+ days`,
  }
}
