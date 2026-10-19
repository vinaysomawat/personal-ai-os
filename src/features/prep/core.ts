import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST, toISTDateStr, istMidnightUtc } from '@/lib/date'
import { formatOf, type MockRound } from './mock'
import { BANK_CATEGORIES, FINAL_BOSS, isRedoDue, companyPrepBlock, levelOf, mockBlock, mockFormatFor, type CategoryCoverage, type UpcomingRound } from './hunt'
import { topicHref } from './links'
import { computeReadinessMatrix, type CodingHistoryRow } from './readiness'
import { bossLadder, buildFightPlan, type Fight } from './boss'
import { dayPace, revisionQueue, topicWeakness, warReadiness, type Forecast } from './war'
import type { BankQuestion, PrepBlock, PrepSession, PrepSettings, Story, StoryRehearsal } from './types'

// Prep's data layer — plain server module (not 'use server', so none of
// this is a publicly callable action). actions.ts wraps it with the
// signed-in user; the War Mode crons and the Daily bot call it with the
// service client. Fight writes live in fight.ts.

export function prepStreak(sessions: { date: string; completed_at: string | null }[], today: string): number {
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

  const [mockRes, storiesRes, rehearsalsRes, codingRes, sessionsRes, fightsRes, forecastRes, nextRoundRes, decidedRoundsRes] = await Promise.all([
    supabase.from('mock_rounds').select('id, format, items, duration_seconds, created_at, review').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    supabase.from('stories').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('story_rehearsals').select('id, story_id, competency, prompt, answer, critique, rating, scorecard, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('coding_daily_questions').select('completed, outcome, completed_at, question:coding_questions(category, topics)').eq('user_id', user.id).eq('completed', true).gte('completed_at', istMidnightUtc(90)),
    supabase.from('prep_sessions').select('*').eq('user_id', user.id).gte('date', daysAgoIST(60)).order('date', { ascending: false }),
    supabase.from('prep_fights').select('*').eq('user_id', user.id).gte('date', daysAgoIST(30)).order('started_at', { ascending: false }),
    supabase.from('prep_forecasts').select('date, forecast, created_at').eq('user_id', user.id).order('date', { ascending: false }).limit(1).maybeSingle(),
    // The next scheduled interview round (Interviews / Career page).
    supabase.from('interview_rounds').select('kind, scheduled_at, application:applications(id, company, jd_analysis, segment)').eq('user_id', user.id).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1).maybeSingle(),
    // Decided real rounds (last 180 days) — a readiness signal (§4.2).
    supabase.from('interview_rounds').select('kind, outcome').eq('user_id', user.id).eq('status', 'done').in('outcome', ['passed', 'failed']).gte('scheduled_at', istMidnightUtc(180)),
  ])
  const [settings, bank] = await Promise.all([getPrepSettings(supabase, user.id), getQuestionBank(supabase, user.id)])
  const coverage = bankCoverage(bank, today)

  const stories = (storiesRes.data ?? []) as Story[]
  const readiness = computeReadinessMatrix((codingRes.data ?? []) as unknown as CodingHistoryRow[], stories, coverage.find(c => c.key === 'ai-native') ?? null,
    bank.filter(q => q.last_rating !== null).map(q => ({ category: q.category, topics: q.topics, rating: q.last_rating! })),
    (decidedRoundsRes.data ?? []) as { kind: string; outcome: 'passed' | 'failed' }[])
  // Empty (not an error) until the mock_rounds migration has run.
  const mockRounds = (mockRes.data ?? []) as MockRound[]
  // Empty until the prep_fights migration has run.
  const fights = (fightsRes.data ?? []) as Fight[]
  const ladder = bossLadder(readiness, fights, today)
  // Company Prep Mode: a round ≤72h away puts its block first.
  const nextRow = nextRoundRes.data as unknown as { kind: string; scheduled_at: string; application: { id: string; company: string; jd_analysis: { priorityTopics?: string[] } | null; segment?: string } | null } | null
  let upcoming: UpcomingRound | null = null
  if (nextRow?.application) {
    const { count } = await supabase.from('interview_questions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('application_id', nextRow.application.id)
    upcoming = { applicationId: nextRow.application.id, company: nextRow.application.company, kind: nextRow.kind, scheduledAt: nextRow.scheduled_at, priorityTopics: nextRow.application.jd_analysis?.priorityTopics ?? [], priorQuestions: count ?? 0, segment: nextRow.application.segment ?? 'other' }
  }
  const companyBlock = companyPrepBlock(upcoming, Date.now(), topicHref)
  const weakness = topicWeakness(bank, today)

  let sessions = (sessionsRes.data ?? []) as PrepSession[]
  let todaySession = sessions.find(s => s.date === today) ?? null
  if (!todaySession) {
    const mockedToday = new Set(mockRounds.filter(r => toISTDateStr(r.created_at) === today).map(r => r.format))
    const format = mockFormatFor(upcoming, today)
    const blocks = buildFightPlan({
      ladder, fights: levelOf(settings.hours_per_day).fights,
      mock: mockBlock(format, mockedToday.has(format)),
      finalBoss: FINAL_BOSS.map(f => mockBlock(f, mockedToday.has(f), `Final boss · ${formatOf(f).label} mock`)),
      companyBlock,
      foughtToday: new Set(fights.filter(f => f.date === today && (f.status === 'won' || f.status === 'lost')).map(f => f.area)),
    })
    const { data: inserted } = await supabase.from('prep_sessions')
      .upsert({ user_id: user.id, date: today, focus: `Boss Ladder · ${levelOf(settings.hours_per_day).label}`, blocks }, { onConflict: 'user_id,date', ignoreDuplicates: true })
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
    // The 13 days before today, oldest first: % of each day's plan done.
    recentScores: Array.from({ length: 13 }, (_, i) => daysAgoIST(13 - i)).map(date => {
      const s = sessions.find(x => x.date === date)
      return { date, score: s ? dayPace(s.blocks, 24).donePct : null }
    }),
    mockRounds,
    // War Mode (all deterministic, war.ts).
    war: warReadiness(readiness, mockRounds, nextRow?.kind ?? null),
    weakness: weakness.slice(0, 8),
    revision: revisionQueue(bank, today),
    fights,
    ladder,
    nextInterview: nextRow ? { company: nextRow.application?.company ?? 'Interview', kind: nextRow.kind, scheduled_at: nextRow.scheduled_at } : null,
    companyBlock,
    forecast: (forecastRes.data as { date: string; forecast: Forecast; created_at: string } | null) ?? null,
    stories,
    rehearsals: (rehearsalsRes.data ?? []) as StoryRehearsal[],
    readiness,
    settings,
    bank,
  }
}

export async function getPrepSettings(supabase: SupabaseClient, userId: string): Promise<PrepSettings> {
  const { data } = await supabase.from('prep_settings').select('hours_per_day, weekly_outreach_target, target_date').eq('user_id', userId).maybeSingle()
  return { hours_per_day: data?.hours_per_day ?? 8, weekly_outreach_target: data?.weekly_outreach_target ?? 25, target_date: data?.target_date ?? null }
}

// PostgREST caps a response at 1,000 rows, and the bank is past that —
// page through it so no category gets silently truncated.
async function fetchAllQuestions(supabase: SupabaseClient) {
  const PAGE = 1000
  const rows: { id: string; title: string; difficulty: string; url: string | null; category: string; topics: string[] | null; sort_order: number | null; answer_hints: string | null; body: string | null }[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('coding_questions')
      .select('id, title, difficulty, url, category, topics, sort_order, answer_hints, body').order('id').range(from, from + PAGE - 1)
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
  // completed pick from the old Coding module (history), so that work counts as covered.
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
      redoDue: qs.filter(q => isRedoDue(q, today)).length,
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
