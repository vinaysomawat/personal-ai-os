import type { Resource, StudyLog } from './types'

// Deterministic, not AI — PRD-v2 Learning goal: "what am I forgetting". A
// completed resource with no recent study activity is a revision candidate.
export function getResourcesNeedingRevision(resources: Resource[], studyLogs: StudyLog[], days = 14): Resource[] {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const recentlyStudiedIds = new Set(studyLogs.filter(l => l.date >= cutoff && l.resource_id).map(l => l.resource_id))
  return resources.filter(r => r.status === 'completed' && !recentlyStudiedIds.has(r.id))
}
