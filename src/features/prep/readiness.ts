import { COMPETENCIES, READINESS_AREAS, type ReadinessCell, type Story } from './types'

// A Question Bank answer's latest AI rating (1–10), for the rating signal.
export interface RatedAnswer {
  category: string
  topics: string[]
  rating: number
}

// Areas fed by a whole bank category, not just by topic.
const AREA_CATEGORY: Partial<Record<string, string>> = {
  uicoding: 'ui-coding', sysdesign: 'system-design', ainative: 'ai-native', behavioral: 'behavioral', dsa: 'algorithm', angular: 'angular',
}
const MIN_RATED_SAMPLE = 2
// Small samples are shrunk toward 0 until they reach this size (2026-10-09):
// 3 solved UI-coding questions at 77 used to read as nearly at its gate and
// starve it of practice time. score × min(1, n / CONFIDENT_SAMPLE).
const CONFIDENT_SAMPLE = 5
const shrink = (score: number, n: number) => Math.round(score * Math.min(1, n / CONFIDENT_SAMPLE))

// A real interview round with a decided outcome (v4.0 §4.2).
export interface DecidedRound {
  kind: string
  outcome: 'passed' | 'failed'
}

// Which readiness areas a round kind tests.
export const ROUND_AREAS: Record<string, string[]> = {
  system_design: ['sysdesign'],
  coding: ['uicoding', 'js'],
  technical: ['js', 'react'],
  phone_screen: ['js', 'react'],
  behavioral: ['behavioral'],
  hiring_manager: ['behavioral', 'leadership'],
  onsite: ['behavioral', 'leadership'],
}
const ROUND_SCORE = { passed: 85, failed: 35 }
const ROUND_CONFIDENT_SAMPLE = 3

// Real rounds outweigh practice: an area's round signal (mean of passed 85 /
// failed 35, shrunk by n/3) counts double against its existing score —
// (base + 2 × rounds) / 3 — or stands alone when the area had no data.
function withRealRounds(cells: ReadinessCell[], rounds: DecidedRound[]): ReadinessCell[] {
  return cells.map(c => {
    const rs = rounds.filter(r => (ROUND_AREAS[r.kind] ?? []).includes(c.key))
    if (rs.length === 0) return c
    const mean = rs.reduce((s, r) => s + ROUND_SCORE[r.outcome], 0) / rs.length
    const signal = Math.round(mean * Math.min(1, rs.length / ROUND_CONFIDENT_SAMPLE))
    const passed = rs.filter(r => r.outcome === 'passed').length
    return {
      ...c,
      score: c.score === null ? signal : Math.round((c.score + 2 * signal) / 3),
      basis: `${c.basis === 'No data yet' ? '' : `${c.basis} · `}${rs.length} real round${rs.length === 1 ? '' : 's'}: ${passed} passed`,
    }
  })
}

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
// self-reported coding outcomes
// on matching topics over the last 90 days — or story coverage for the two
// behavioral/leadership areas. null = no data yet.
export function computeReadinessMatrix(codingHistory: CodingHistoryRow[], stories: Story[], aiNative: { total: number; seen: number } | null = null, rated: RatedAnswer[] = [], rounds: DecidedRound[] = [], now = new Date()): ReadinessCell[] {
  return withRealRounds(baseMatrix(codingHistory, stories, aiNative, rated, now), rounds)
}

function baseMatrix(codingHistory: CodingHistoryRow[], stories: Story[], aiNative: { total: number; seen: number } | null, rated: RatedAnswer[], now: Date): ReadinessCell[] {
  const since = new Date(now.getTime() - CODING_WINDOW_DAYS * 86400000).toISOString()
  const recentCoding = codingHistory.filter(r => r.completed && r.completed_at && r.completed_at >= since && r.question)

  // AI answer ratings (×10) on this area's category or topics — the most
  // direct skill signal once ≥2 answers are rated.
  const ratingPart = (key: string, codingTopics: readonly string[]): { score: number; n: number } | null => {
    const rs = rated.filter(r => r.category === AREA_CATEGORY[key] || r.topics.some(t => codingTopics.includes(t)))
    return rs.length >= MIN_RATED_SAMPLE ? { score: shrink(Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10), rs.length), n: rs.length } : null
  }

  return READINESS_AREAS.map(area => {
    const rp = ratingPart(area.key, area.codingTopics)
    if (area.key === 'behavioral' || area.key === 'leadership') {
      const cov = storyCoverage(stories, area.key)
      const covScore = cov.covered === 0 && cov.pct === 0 ? null : cov.pct
      const parts = [covScore, area.key === 'behavioral' ? rp?.score ?? null : null].filter((v): v is number => v !== null)
      return {
        key: area.key, label: area.label, href: area.href,
        score: parts.length ? Math.round(parts.reduce((s, v) => s + v, 0) / parts.length) : null,
        basis: [`${cov.covered}/${cov.total} competencies with a solid story`, area.key === 'behavioral' && rp ? `${rp.n} rated answers` : null].filter(Boolean).join(' · '),
      }
    }

    // AI-native: average AI rating once ≥2 answers are rated, else the share
    // of the section practiced (coverage, not skill).
    if (area.key === 'ainative') {
      return {
        key: area.key, label: area.label, href: area.href,
        score: rp ? rp.score : aiNative && aiNative.seen > 0 ? Math.round((aiNative.seen / aiNative.total) * 100) : null,
        basis: rp ? `${rp.n} rated answers` : aiNative ? `${aiNative.seen}/${aiNative.total} practiced` : 'No data yet',
      }
    }

    const codingRows = recentCoding.filter(r => {
      const q = r.question!
      if (area.key === 'uicoding' && q.category === 'ui-coding') return true
      if (area.key === 'sysdesign' && q.category === 'system-design') return true
      if (area.key === 'dsa' && q.category === 'algorithm') return true
      return (q.topics ?? []).some(t => (area.codingTopics as readonly string[]).includes(t))
    })
    const codingPart = codingRows.length >= MIN_CODING_SAMPLE
      ? shrink(Math.round(codingRows.reduce((s, r) => s + (r.outcome ? OUTCOME_SCORE[r.outcome] ?? NO_OUTCOME_SCORE : NO_OUTCOME_SCORE), 0) / codingRows.length), codingRows.length)
      : null

    // The Career topic-quiz signal was dropped with the quiz (2026-10-08).
    const parts = [codingPart, rp?.score ?? null].filter((v): v is number => v !== null)
    const basis = [
      codingPart !== null ? `${codingRows.length} coding Qs` : null,
      rp ? `${rp.n} rated answers` : null,
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
