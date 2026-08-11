'use server'

import { createClient } from '@/lib/supabase/server'
import { computeWeakAreas } from './daily-core'
import { getInsightsHistory, getActiveCompanyPriorityTopics } from './daily'
import { recommendCodingQuestions } from '@/features/ai/coding-mentor'
import type { CodingQuestion, WeakArea } from './daily-core'

export interface CodingRecommendation {
  question: CodingQuestion
  reason: string
}

export interface CodingRecommendationsResult {
  recommendations: CodingRecommendation[]
  weakAreas: WeakArea[]
  company: { company: string; topics: string[] } | null
}

// Deterministic prep (weak areas, candidate pool, company signal) happens
// here; the AI call only ever ranks/picks from the already-narrowed pool it's
// handed — see recommendCodingQuestions's own comment for why.
export async function getCodingRecommendations(): Promise<CodingRecommendationsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { recommendations: [], weakAreas: [], company: null }

  const [history, { data: pool }, { data: completedRows }, company] = await Promise.all([
    getInsightsHistory(),
    supabase.from('coding_questions').select('*'),
    supabase.from('coding_daily_questions').select('question_id').eq('user_id', user.id).eq('completed', true),
    getActiveCompanyPriorityTopics(),
  ])

  const weakAreas = computeWeakAreas(history)
  const allQuestions = (pool ?? []) as CodingQuestion[]
  const completedIds = new Set((completedRows ?? []).map(r => r.question_id as string))
  const targetTopics = new Set([...weakAreas.map(w => w.topic), ...(company?.topics ?? [])])

  let candidates = allQuestions.filter(q => !completedIds.has(q.id) && q.topics?.some(t => targetTopics.has(t)))
  // No weak areas or company signal yet (early days) — fall back to any
  // not-yet-attempted, topic-tagged question so recommendations still work.
  if (candidates.length === 0) {
    candidates = allQuestions.filter(q => !completedIds.has(q.id) && q.topics?.length).slice(0, 30)
  } else {
    candidates = candidates.slice(0, 30)
  }

  const picks = await recommendCodingQuestions(candidates, weakAreas, company)
  const byId = new Map(allQuestions.map(q => [q.id, q]))
  const recommendations = picks
    .map(p => ({ question: byId.get(p.questionId), reason: p.reason }))
    .filter((r): r is CodingRecommendation => !!r.question)

  return { recommendations, weakAreas, company }
}
