import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST, toISTDateStr, istMidnightUtc } from '@/lib/date'
import { getTodayAssignmentRows } from '@/features/coding/daily-core'
import { formatMinutes, mockFormatForDay, type MockRound } from './mock'
import { buildPrepPlan } from './plan'
import { BANK_CATEGORIES, buildHuntPlan, computeQuotas, daysLeft, leadMinutes, type CategoryCoverage } from './hunt'
import { computeReadinessMatrix, weakestAreas, type CodingHistoryRow } from './readiness'
import { COMPETENCIES, READINESS_AREAS } from './types'
import { categoryGap, categoryWeights, focusSeconds, nowBlock, revisionQueue, topicWeakness, warReadiness, type FocusSession, type Forecast } from './war'
import type { BankQuestion, PrepBlock, PrepSession, PrepSettings, Story, StoryRehearsal } from './types'

// Prep's data layer — plain server module (not 'use server', so none of
// this is a publicly callable action). actions.ts wraps it with the
// signed-in user; the War Mode crons and the Daily bot call it with the
// service client.

function prepStreak(sessions: { date: string; completed_at: string | null }[], today: string): number {
  const done = new Set(sessions.filter(s => s.completed_at).map(s => s.date))
  let streak = 0
  const cursor = new Date(`${today}T00:00:00Z`)
  for (let i = 0; i < 3650; i++) {
    const d = cursor.toISOString().slice(0, 10)
    if (done.has(d)) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1) }
    else if (i === 0) cursor.setUTCDate(cursor.getUTCDate() - 1)
    else break
  }
  return streak
}

// Everything the Prep page (and the Telegram coach) needs, building and
// persisting today's plan on first load. Takes a client so the cookie-based
// page action and the service-role crons share one code path.
export async function loadPrepData(supabase: SupabaseClient, userId: string) {
  const user = { id: userId }
  const today = todayIST()

  const [mockRes, storiesRes, rehearsalsRes, codingRes, activePicks, sessionsRes, focusRes, forecastRes, nextRoundRes] = await Promise.all([
    supabase.from('mock_rounds').select('id, format, items, duration_seconds, created_at, review').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    supabase.from('stories').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('story_rehearsals').select('id, story_id, competency, prompt, answer, critique, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('coding_daily_questions').select('completed, outcome, completed_at, question:coding_questions(category, topics)').eq('user_id', user.id).eq('completed', true).gte('completed_at', istMidnightUtc(90)),
    getTodayAssignmentRows(supabase, user.id),
    supabase.from('prep_sessions').select('*').eq('user_id', user.id).gte('date', daysAgoIST(60)).order('date', { ascending: false }),
    supabase.from('prep_focus_sessions').select('*').eq('user_id', user.id).gte('date', daysAgoIST(6)).order('started_at', { ascending: true }),
    supabase.from('prep_forecasts').select('date, forecast, created_at').eq('user_id', user.id).order('date', { ascending: false }).limit(1).maybeSingle(),
    // The next scheduled interview round (Interviews / Career page).
    supabase.from('interview_rounds').select('kind, scheduled_at, application:applications(company)').eq('user_id', user.id).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1).maybeSingle(),
  ])
  const [settings, bank] = await Promise.all([getPrepSettings(supabase, user.id), getQuestionBank(supabase, user.id)])
  const days = settings.target_date ? daysLeft(today, settings.target_date) : null
  const coverage = bankCoverage(bank, today)

  const stories = (storiesRes.data ?? []) as Story[]
  const readiness = computeReadinessMatrix((codingRes.data ?? []) as unknown as CodingHistoryRow[], stories, coverage.find(c => c.key === 'ai-native') ?? null,
    bank.filter(q => q.last_rating !== null).map(q => ({ category: q.category, topics: q.topics, rating: q.last_rating! })))
  // Empty (not an error) until the mock_rounds migration has run.
  const mockRounds = (mockRes.data ?? []) as MockRound[]
  // War Mode: quotas weighted toward the biggest readiness gaps, sized to
  // the time left after today's mock round and STAR-story block.
  const storiesMissing = COMPETENCIES.some(c => !stories.some(s => (s.strength ?? 3) >= 3 && s.competencies.includes(c.key)))
  const reserved = formatMinutes(mockFormatForDay(today)) + leadMinutes(settings.hours_per_day * 60, storiesMissing)
  const quotas = days !== null
    ? computeQuotas(coverage, settings.hours_per_day, days, categoryWeights(readiness), reserved)
      // On machine-coding days the mock round IS the UI-coding practice.
      .map(q => q.key === 'ui-coding' && mockFormatForDay(today) === 'machine-coding' ? { ...q, quota: 0, minutes: 0 } : q)
    : null
  const weakness = topicWeakness(bank, today)

  let sessions = (sessionsRes.data ?? []) as PrepSession[]
  let todaySession = sessions.find(s => s.date === today) ?? null
  if (!todaySession) {
    // Weakest area that maps to a quiz topic — drives the quiz-based blocks.
    const weakQuizArea = weakestAreas(readiness, READINESS_AREAS.length)
      .map(c => READINESS_AREAS.find(a => a.key === c.key)!)
      .find(a => a.quizTopics.length > 0)
    const covered = new Set(stories.filter(s => (s.strength ?? 3) >= 3).flatMap(s => s.competencies))
    const uncovered = COMPETENCIES.find(c => !covered.has(c.key))
    const plan = quotas && days !== null ? buildHuntPlan({
      hoursPerDay: settings.hours_per_day, days, date: today, quotas,
      uncoveredCompetency: uncovered?.label ?? null,
      gaps: Object.fromEntries(BANK_CATEGORIES.map(c => [c.key, categoryGap(c.key, readiness)])),
      focusTopic: weakness.find(w => w.category === 'quiz')?.topic ?? null,
      mockDoneToday: mockRounds.some(r => toISTDateStr(r.created_at) === today),
    }) : buildPrepPlan(today, {
      weakestTopic: weakQuizArea ? { area: weakQuizArea.label, topic: (weakQuizArea.quizTopics as readonly string[])[0] } : null,
      uncoveredCompetency: uncovered?.label ?? null,
      codingPicks: activePicks.filter(p => !p.completed).map(p => ({ category: p.question.category, title: p.question.title })),
    })
    const { data: inserted } = await supabase.from('prep_sessions')
      .upsert({ user_id: user.id, date: today, focus: plan.focus, blocks: plan.blocks }, { onConflict: 'user_id,date', ignoreDuplicates: true })
      .select('*')
    todaySession = ((inserted ?? [])[0] as PrepSession | undefined) ?? null
    if (!todaySession) {
      const { data } = await supabase.from('prep_sessions').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
      todaySession = (data as PrepSession | null) ?? null
    }
    if (todaySession) sessions = [todaySession, ...sessions]
  }

  return {
    today,
    session: todaySession,
    streak: prepStreak(sessions, today),
    sessionsLast7: sessions.filter(s => s.date >= daysAgoIST(6) && s.completed_at).length,
    mockRounds,
    // War Mode (all deterministic, war.ts).
    war: warReadiness(readiness, mockRounds),
    weakness: weakness.slice(0, 8),
    revision: revisionQueue(bank, today),
    focusSessions: (focusRes.data ?? []) as FocusSession[],
    nextInterview: nextRoundRes.data ? { company: (nextRoundRes.data as unknown as { application: { company: string } | null }).application?.company ?? 'Interview', kind: nextRoundRes.data.kind as string, scheduled_at: nextRoundRes.data.scheduled_at as string } : null,
    forecast: (forecastRes.data as { date: string; forecast: Forecast; created_at: string } | null) ?? null,
    stories,
    rehearsals: (rehearsalsRes.data ?? []) as StoryRehearsal[],
    readiness,
    settings,
    daysLeft: days,
    coverage: quotas ?? coverage,
    bank,
  }
}

export async function getPrepSettings(supabase: SupabaseClient, userId: string): Promise<PrepSettings> {
  const { data } = await supabase.from('prep_settings').select('target_date, hours_per_day').eq('user_id', userId).maybeSingle()
  return { target_date: data?.target_date ?? null, hours_per_day: data?.hours_per_day ?? 8 }
}

// PostgREST caps a response at 1,000 rows, and the bank is past that —
// page through it so no category gets silently truncated.
async function fetchAllQuestions(supabase: SupabaseClient) {
  const PAGE = 1000
  const rows: { id: string; title: string; difficulty: string; url: string | null; category: string; topics: string[] | null; sort_order: number | null; answer_hints: string | null }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('coding_questions')
      .select('id, title, difficulty, url, category, topics, sort_order, answer_hints').order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

export async function getQuestionBank(supabase: SupabaseClient, userId: string): Promise<BankQuestion[]> {
  const [questions, { data: progress }, { data: coding }] = await Promise.all([
    fetchAllQuestions(supabase),
    supabase.from('question_progress').select('question_id, last_seen_at, last_answer, last_rating, last_rated_at').eq('user_id', userId),
    supabase.from('coding_daily_questions').select('question_id, completed_at').eq('user_id', userId).eq('completed', true),
  ])
  // Last practiced = the newer of a Question Bank / Mock Round answer and a
  // completed Coding pick, so Coding work counts as covered.
  const lastSeen = new Map<string, string>()
  const answers = new Map<string, string | null>()
  const ratings = new Map<string, { last_rating: number | null; last_rated_at: string | null }>()
  const touch = (id: string, at: string) => { if ((lastSeen.get(id) ?? '') < at) lastSeen.set(id, at) }
  for (const c of coding ?? []) if (c.completed_at) touch(c.question_id, c.completed_at)
  for (const p of progress ?? []) { touch(p.question_id, p.last_seen_at); answers.set(p.question_id, p.last_answer); ratings.set(p.question_id, { last_rating: p.last_rating ?? null, last_rated_at: p.last_rated_at ?? null }) }
  return questions.map(q => ({
    ...q, topics: q.topics ?? [],
    last_seen_at: lastSeen.get(q.id) ?? null,
    last_answer: answers.get(q.id) ?? null,
    last_rating: ratings.get(q.id)?.last_rating ?? null,
    last_rated_at: ratings.get(q.id)?.last_rated_at ?? null,
  }))
}

export function bankCoverage(bank: BankQuestion[], today: string): CategoryCoverage[] {
  return BANK_CATEGORIES.map(cat => {
    const qs = bank.filter(q => q.category === cat.key)
    return {
      key: cat.key, label: cat.label, total: qs.length,
      seen: qs.filter(q => q.last_seen_at).length,
      doneToday: qs.filter(q => q.last_seen_at && toISTDateStr(q.last_seen_at) === today).length,
    }
  })
}

export async function updateBlocks(supabase: SupabaseClient, userId: string, date: string, fn: (blocks: PrepBlock[]) => PrepBlock[]): Promise<PrepSession | null> {
  const { data } = await supabase.from('prep_sessions').select('*').eq('user_id', userId).eq('date', date).maybeSingle()
  if (!data) return null
  const blocks = fn(data.blocks as PrepBlock[])
  const allDone = blocks.length > 0 && blocks.every(b => b.done)
  const { data: updated } = await supabase.from('prep_sessions')
    .update({ blocks, completed_at: allDone ? (data.completed_at ?? new Date().toISOString()) : null })
    .eq('id', data.id).select('*').single()
  return (updated as PrepSession | null) ?? null
}

// Ticks Job Hunt bank blocks whose quota (the label's "× N") today's practiced
// count in that category has reached. `extra` lets a caller tick more blocks
// in the same write.
export async function syncBankBlocks(supabase: SupabaseClient, userId: string, categories: string[], extra: (b: PrepBlock) => boolean = () => false): Promise<PrepSession | null> {
  const counts = new Map<string, number>()
  if (categories.length > 0) {
    const { data } = await supabase.from('question_progress')
      .select('question_id, coding_questions!inner(category)').eq('user_id', userId)
      .in('coding_questions.category', categories).gte('last_seen_at', istMidnightUtc())
    for (const row of (data ?? []) as unknown as { coding_questions: { category: string } }[]) {
      counts.set(row.coding_questions.category, (counts.get(row.coding_questions.category) ?? 0) + 1)
    }
  }
  return updateBlocks(supabase, userId, todayIST(), blocks => blocks.map(b => {
    if (extra(b)) return { ...b, done: true }
    const cat = b.key.startsWith('bank:') ? b.key.slice(5) : null
    if (!cat || !categories.includes(cat)) return b
    const quota = Number(b.label.match(/× (\d+)$/)?.[1] ?? 0)
    return quota > 0 && (counts.get(cat) ?? 0) >= quota ? { ...b, done: true } : b
  }))
}


// ---------------- Focus sessions (War Mode) ----------------

export async function getActiveFocus(supabase: SupabaseClient, userId: string): Promise<FocusSession | null> {
  const { data } = await supabase.from('prep_focus_sessions').select('*').eq('user_id', userId).eq('status', 'active').order('started_at', { ascending: false }).limit(1).maybeSingle()
  return (data as FocusSession | null) ?? null
}

// Starts a focus session on a block of today's plan (the NOW block when no
// key is given). One active session at a time — an existing one is returned.
export async function startFocus(supabase: SupabaseClient, userId: string, blockKey?: string): Promise<FocusSession | null> {
  const active = await getActiveFocus(supabase, userId)
  if (active) return active
  const today = todayIST()
  let { data: session } = await supabase.from('prep_sessions').select('blocks').eq('user_id', userId).eq('date', today).maybeSingle()
  if (!session) { await loadPrepData(supabase, userId); ({ data: session } = await supabase.from('prep_sessions').select('blocks').eq('user_id', userId).eq('date', today).maybeSingle()) }
  const blocks = (session?.blocks ?? []) as PrepBlock[]
  const block = blockKey ? blocks.find(b => b.key === blockKey) : nowBlock(blocks)
  if (!block) return null
  const { data, error } = await supabase.from('prep_focus_sessions')
    .insert({ user_id: userId, date: today, block_key: block.key, label: block.label, planned_minutes: block.minutes })
    .select('*').single()
  if (error) throw new Error(error.message)
  return data as FocusSession
}

// Pause/resume: a pause counts as one interruption; resuming adds the paused
// span to paused_seconds.
export async function toggleFocusPause(supabase: SupabaseClient, userId: string, id: string): Promise<FocusSession | null> {
  const { data: f } = await supabase.from('prep_focus_sessions').select('*').eq('id', id).eq('user_id', userId).single()
  if (!f || f.status !== 'active') return (f as FocusSession | null) ?? null
  const patch = f.paused_at
    ? { paused_at: null, paused_seconds: f.paused_seconds + Math.round((Date.now() - new Date(f.paused_at).getTime()) / 1000) }
    : { paused_at: new Date().toISOString(), interruptions: f.interruptions + 1 }
  const { data } = await supabase.from('prep_focus_sessions').update(patch).eq('id', id).select('*').single()
  return (data as FocusSession | null) ?? null
}

// Finish = the block is done (ticked in today's plan); abandon = time is
// kept but the block stays open.
export async function endFocus(supabase: SupabaseClient, userId: string, id: string, finished: boolean): Promise<{ focus: FocusSession | null; session: PrepSession | null }> {
  const { data: f } = await supabase.from('prep_focus_sessions').select('*').eq('id', id).eq('user_id', userId).single()
  if (!f || f.status !== 'active') return { focus: (f as FocusSession | null) ?? null, session: null }
  const { data } = await supabase.from('prep_focus_sessions')
    .update({ status: finished ? 'completed' : 'abandoned', ended_at: new Date().toISOString(), actual_seconds: focusSeconds(f as FocusSession), paused_at: null })
    .eq('id', id).select('*').single()
  const session = finished ? await updateBlocks(supabase, userId, f.date, blocks => blocks.map(b => b.key === f.block_key ? { ...b, done: true } : b)) : null
  return { focus: (data as FocusSession | null) ?? null, session }
}
