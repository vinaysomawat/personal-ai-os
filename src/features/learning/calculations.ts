import type { Resource, StudyLog } from './types'
import { daysAgoIST } from '@/lib/date'

// Deterministic, not AI — PRD-v2 Learning goal: "what am I forgetting". A
// completed resource with no recent study activity is a revision candidate.
export function getResourcesNeedingRevision(resources: Resource[], studyLogs: StudyLog[], days = 14): Resource[] {
  const cutoff = daysAgoIST(days)
  const recentlyStudiedIds = new Set(studyLogs.filter(l => l.date >= cutoff && l.resource_id).map(l => l.resource_id))
  return resources.filter(r => r.status === 'completed' && !recentlyStudiedIds.has(r.id))
}

// Consecutive days (walking back from today) with at least one study log —
// same shape as Coding's currentStreak in daily-core.ts, reused by Career's
// getCareerData() to feed the mentor context.
export function getStudyStreak(logs: { date: string }[]): number {
  const studyDays = new Set(logs.map(l => l.date))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    if (studyDays.has(daysAgoIST(i))) streak++
    else break
  }
  return streak
}
