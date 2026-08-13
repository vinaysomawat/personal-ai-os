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
// getCareerData() to feed the mentor context. Today is allowed to be pending
// without breaking the streak (mirrors daily-core.ts's "today still open"
// leniency) — otherwise the streak would drop to 0 every morning before
// there's been a chance to log that day's session.
export function getStudyStreak(logs: { date: string }[]): number {
  const studyDays = new Set(logs.map(l => l.date))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    if (studyDays.has(daysAgoIST(i))) streak++
    else if (i === 0) continue
    else break
  }
  return streak
}
