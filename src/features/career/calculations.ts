// Deterministic, not AI — same 14-day idle rule as Learning's
// getResourcesNeedingRevision and Coding's getStaleRevisionCount, applied to
// the Interview Q&A bank. Falls back to created_at when never reviewed, so a
// freshly-added item isn't immediately flagged stale.
export function getQAsNeedingRevision<T extends { created_at: string; last_reviewed_at: string | null }>(qa: T[], days = 14): T[] {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()
  return qa.filter(q => (q.last_reviewed_at ?? q.created_at) < cutoff)
}
