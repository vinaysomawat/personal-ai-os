// AI review scorecard (Question Bank answers, Story Bank rehearsals) — types
// and labels shared by the server grader (critique.ts) and the client review
// card (AnswerReview).

import type { StoryRehearsal } from './types'

export type Rubric = 'technical' | 'behavioral' | 'ai-native' | 'story' | 'code-review'
export type PointStatus = 'covered' | 'partial' | 'missing'

export interface Scorecard {
  rubric: Rubric
  verdict: 'Strong' | 'Good' | 'Needs work'
  summary: string
  points: { point: string; status: PointStatus; note: string }[]
  correctness: 0 | 1 | 2
  depth: 0 | 1 | 2
  clarity: 0 | 1
  fixes: string[]
  followUp: string
}

// Labels for the three criterion scores, per rubric (UI + Telegram text).
export const CRITERIA: Record<Rubric, { correctness: string; depth: string; clarity: string }> = {
  technical: { correctness: 'Correctness', depth: 'Depth', clarity: 'Clarity' },
  behavioral: { correctness: 'No red flags', depth: 'Evidence', clarity: 'Direct & concise' },
  'ai-native': { correctness: 'Judgment', depth: 'Real example', clarity: 'Clarity' },
  story: { correctness: 'Own contribution', depth: 'Evidence', clarity: 'Concise' },
  'code-review': { correctness: 'Findings correct', depth: 'Severity & prioritization', clarity: 'Fix quality' },
}

const STATUSES: PointStatus[] = ['covered', 'partial', 'missing']

// A review as it arrives: the finished parts of the scorecard. The rating is
// computed from the whole card, so it only comes with the final result.
export type PartialReview = Pick<Scorecard, 'points' | 'summary' | 'fixes' | 'followUp'>
export interface ReviewResult { rating: number | null; feedback: string; card: Scorecard | null }

// One line of a streamed review. A saved Story Bank rehearsal comes with its row.
export type ReviewEvent = { partial: PartialReview } | { final: ReviewResult & { rehearsal?: StoryRehearsal } }

// Reads the scorecard JSON while it's still being written. It cuts the text
// back to the last finished value and closes what's still open, so a half
// written string never shows. A point counts once its note has arrived, so a
// point never shows with the wrong mark. Null until something can be shown.
export function partialReview(raw: string): PartialReview | null {
  const begin = raw.indexOf('{')
  if (begin < 0) return null
  const open: string[] = []
  let inString = false
  let escaped = false
  let end = -1
  let closers = ''
  for (let i = begin; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') open.push('}')
    else if (ch === '[') open.push(']')
    else if (ch === '}' || ch === ']' || ch === ',') {
      if (ch !== ',') open.pop()
      end = ch === ',' ? i : i + 1
      closers = [...open].reverse().join('')
    }
  }
  if (end < 0) return null

  let j: Record<string, unknown>
  try { j = JSON.parse(raw.slice(begin, end) + closers) } catch { return null }
  const points = (Array.isArray(j.points) ? j.points : []).slice(0, 8).flatMap(p => {
    const o = (p ?? {}) as Record<string, unknown>
    const status = o.status as PointStatus
    return typeof o.point === 'string' && o.point.trim() && typeof o.note === 'string' && STATUSES.includes(status)
      ? [{ point: o.point.trim(), status, note: o.note.trim() }]
      : []
  })
  const summary = typeof j.summary === 'string' ? j.summary.trim() : ''
  if (points.length === 0 && !summary) return null
  return {
    points, summary,
    fixes: (Array.isArray(j.fixes) ? j.fixes : []).map(String).map(s => s.trim()).filter(Boolean).slice(0, 4),
    followUp: typeof j.followUp === 'string' ? j.followUp.trim() : '',
  }
}
