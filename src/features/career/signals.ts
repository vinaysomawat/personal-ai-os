import type { Signal } from '@/lib/signals'
import { todayIST, toISTDateStr } from '@/lib/date'

// Interviews (v3.4) feed Needs Attention with two deterministic signals.

// A round within the next 48 hours — the single most important thing to
// prepare for.
export function checkUpcomingInterview(next: { company: string; kind: string; scheduled_at: string } | null, nowMs = Date.now()): Signal | null {
  if (!next) return null
  const hours = (new Date(next.scheduled_at).getTime() - nowMs) / 3600_000
  if (hours < 0 || hours > 48) return null
  return {
    id: 'career.upcoming_interview', module: 'career', weight: 95, emoji: '📅', href: '/interviews',
    message: `${next.company} ${next.kind.replace(/_/g, ' ')} round ${toISTDateStr(next.scheduled_at) === todayIST() ? 'today' : 'tomorrow'} — prep for it now`,
  }
}

// A company mid-process with no round on the calendar — log the next one or
// follow up with the recruiter.
export function checkUnscheduledProcess(active: { company: string }[], scheduledCompanies: Set<string>): Signal | null {
  const idle = active.filter(a => !scheduledCompanies.has(a.company))
  if (idle.length === 0) return null
  return {
    id: 'career.unscheduled_process', module: 'career', weight: 58, emoji: '🎯', href: '/interviews',
    message: `${idle.map(a => a.company).slice(0, 2).join(', ')}${idle.length > 2 ? ` +${idle.length - 2}` : ''}: no next round scheduled — log it or follow up`,
  }
}
