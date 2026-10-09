import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

// Real interview questions feed the Question Bank (v4.0 §4.1). A question
// that went badly or ok becomes a linked coding_questions row in the
// 'interview' category with your answer prefilled and a seeded rating
// (badly 3, ok 6) so the revision queue and topic weakness pick it up at
// once; one that later went well is re-rated 8 (the bank row stays).

const DEFAULT_TOPIC: Record<string, string | null> = {
  technical: 'JavaScript Fundamentals', coding: 'Algorithms', system_design: 'System Design',
  behavioral: 'Behavioral', ai_native: 'AI-native', other: null,
}
const SEED_RATING: Record<string, number> = { badly: 3, ok: 6, well: 8 }

export interface SyncableQuestion {
  id: string
  application_id: string
  question: string
  category: string
  topic: string | null
  my_answer: string | null
  went: 'well' | 'ok' | 'badly' | null
  notes: string | null
  bank_question_id: string | null
}

export async function syncInterviewQuestionToBank(db: SupabaseClient, userId: string, q: SyncableQuestion): Promise<string | null> {
  if (!q.went) return q.bank_question_id
  if (q.went === 'well' && !q.bank_question_id) return null
  let bankId = q.bank_question_id
  if (!bankId) {
    const { data: app } = await db.from('applications').select('company').eq('id', q.application_id).maybeSingle()
    const topic = q.topic || DEFAULT_TOPIC[q.category] || null
    // coding_questions is the shared global pool — written with the service client.
    const { data, error } = await createServiceClient().from('coding_questions').insert({
      title: q.question, difficulty: 'medium', category: 'interview', url: null,
      source: `${app?.company ?? 'Real'} interview`, answer_hints: q.notes || null, topics: topic ? [topic] : [],
    }).select('id').single()
    if (error || !data) return null
    bankId = data.id as string
    await db.from('interview_questions').update({ bank_question_id: bankId }).eq('id', q.id)
  }
  const now = new Date().toISOString()
  const { data: prev } = await db.from('question_progress').select('attempts, last_answer').eq('user_id', userId).eq('question_id', bankId).maybeSingle()
  await db.from('question_progress').upsert({
    user_id: userId, question_id: bankId,
    attempts: Math.max(1, prev?.attempts ?? 0), last_answer: q.my_answer || prev?.last_answer || null,
    last_seen_at: now, last_rating: SEED_RATING[q.went], last_rated_at: now,
  }, { onConflict: 'user_id,question_id' })
  return bankId
}
