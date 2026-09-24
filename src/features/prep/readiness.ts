import { computeReadiness } from '@/features/career/quiz-calculations'
import type { QuizAttempt } from '@/features/career/types'
import { COMPETENCIES, READINESS_AREAS, type ReadinessCell, type Story } from './types'

export interface CodingHistoryRow {
  completed: boolean
  outcome: string | null
  completed_at: string | null
  question: { category: string; topics: string[] | null } | null
}

// Self-reported outcome → a 0–100 practice score. A completion with no
// outcome (the modal was skipped) counts as a moderate solve.
const OUTCOME_SCORE: Record<string, number> = { solved: 100, solved_with_help: 60, struggled: 30 }
const NO_OUTCOME_SCORE = 70
const CODING_WINDOW_DAYS = 90
const MIN_CODING_SAMPLE = 2

// A story counts toward coverage when rated ≥3/5 (unrated counts as 3);
// weaker drafts count half — something to rehearse, not nothing.
function storyCoverage(stories: Story[], group: 'behavioral' | 'leadership'): { pct: number; covered: number; total: number } {
  const keys = COMPETENCIES.filter(c => c.group === group).map(c => c.key as string)
  let points = 0
  let covered = 0
  for (const key of keys) {
    const tagged = stories.filter(s => s.competencies.includes(key))
    if (tagged.length === 0) continue
    const best = Math.max(...tagged.map(s => s.strength ?? 3))
    if (best >= 3) { points += 1; covered += 1 } else points += 0.5
  }
  return { pct: Math.round((points / keys.length) * 100), covered, total: keys.length }
}

// Deterministic readiness across the senior-FE interview surface (no AI).
// Each area blends whatever real signal exists — recency-weighted topic
// quiz scores (Career's computeReadiness) and self-reported coding outcomes
// on matching topics over the last 90 days — or story coverage for the two
// behavioral/leadership areas. null = no data yet.
export function computeReadinessMatrix(quizAttempts: QuizAttempt[], codingHistory: CodingHistoryRow[], stories: Story[], now = new Date()): ReadinessCell[] {
  const since = new Date(now.getTime() - CODING_WINDOW_DAYS * 86400000).toISOString()
  const recentCoding = codingHistory.filter(r => r.completed && r.completed_at && r.completed_at >= since && r.question)

  return READINESS_AREAS.map(area => {
    if (area.key === 'behavioral' || area.key === 'leadership') {
      const cov = storyCoverage(stories, area.key)
      return {
        key: area.key, label: area.label, href: area.href,
        score: cov.covered === 0 && cov.pct === 0 ? null : cov.pct,
        basis: `${cov.covered}/${cov.total} competencies with a solid story`,
      }
    }

    const quizScores = (area.quizTopics as readonly string[])
      .map(t => computeReadiness(quizAttempts, t).avgPercent)
      .filter((v): v is number => v !== null)
    const quizPart = quizScores.length ? Math.round(quizScores.reduce((s, v) => s + v, 0) / quizScores.length) : null

    const codingRows = recentCoding.filter(r => {
      const q = r.question!
      if (area.key === 'uicoding' && q.category === 'ui-coding') return true
      if (area.key === 'sysdesign' && q.category === 'system-design') return true
      return (q.topics ?? []).some(t => (area.codingTopics as readonly string[]).includes(t))
    })
    const codingPart = codingRows.length >= MIN_CODING_SAMPLE
      ? Math.round(codingRows.reduce((s, r) => s + (r.outcome ? OUTCOME_SCORE[r.outcome] ?? NO_OUTCOME_SCORE : NO_OUTCOME_SCORE), 0) / codingRows.length)
      : null

    const parts = [quizPart, codingPart].filter((v): v is number => v !== null)
    const basis = [
      quizPart !== null ? `quiz ${quizPart}%` : null,
      codingPart !== null ? `${codingRows.length} coding Qs` : null,
    ].filter(Boolean).join(' · ') || 'No data yet'

    return {
      key: area.key, label: area.label, href: area.href, basis,
      score: parts.length ? Math.round(parts.reduce((s, v) => s + v, 0) / parts.length) : null,
    }
  })
}

// The 3 areas to focus on next: no-data areas first (a blind spot is the
// biggest risk in a loop), then lowest score.
export function weakestAreas(cells: ReadinessCell[], n = 3): ReadinessCell[] {
  return [...cells].sort((a, b) => (a.score ?? -1) - (b.score ?? -1)).slice(0, n)
}

export function overallReadiness(cells: ReadinessCell[]): number {
  // Blind spots count as 0 — readiness is about the whole loop.
  return Math.round(cells.reduce((s, c) => s + (c.score ?? 0), 0) / cells.length)
}
