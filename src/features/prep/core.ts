import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { prepToday, prepDaysAgo, toPrepDateStr, prepDayStartUtc } from '@/lib/date'
import type { MockRound } from './mock'
import { BANK_CATEGORIES, isRedoDue, type CategoryCoverage } from './hunt'
import { DEFAULT_TEMPLATE, applyTodayPatch, layoutDay, patchTouchesBlocks, planItems, templateOf, type TodayPatch } from './dayplan'
import type { RoadmapProgress } from './roadmap'
import { computeReadinessMatrix, type CodingHistoryRow } from './readiness'
import { blockProgress, windowOf, blockReached, canFinishBlock, categoryGap, dayPace, focusedMinutes, minutesPerQuestion, type ProgressCtx, isGoodDay, focusSeconds, nowBlock, revisionQueue, topicWeakness, warReadiness, type FocusSession } from './war'
import type { BankQuestion, PrepBlock, PrepSession, PrepSettings, Story, StoryRehearsal } from './types'

// Prep's data layer — plain server module (not 'use server', so none of
// this is a publicly callable action). actions.ts wraps it with the
// signed-in user; the War Mode crons and the Daily bot call it with the
// service client.

// Consecutive days with a completed session (today given grace).
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
  const today = prepToday()

  // One round of parallel reads (settings and the bank included).
  const [mockRes, storiesRes, rehearsalsRes, codingRes, sessionsRes, focusRes, roadmapRes, settings, bank] = await Promise.all([
    supabase.from('mock_rounds').select('id, format, items, duration_seconds, created_at, review').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    supabase.from('stories').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('story_rehearsals').select('id, story_id, competency, prompt, answer, critique, rating, scorecard, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('coding_daily_questions').select('completed, outcome, completed_at, question:coding_questions(category, topics)').eq('user_id', user.id).eq('completed', true).gte('completed_at', prepDayStartUtc(90)),
    supabase.from('prep_sessions').select('*').eq('user_id', user.id).gte('date', prepDaysAgo(60)).order('date', { ascending: false }),
    supabase.from('prep_focus_sessions').select('*').eq('user_id', user.id).gte('date', prepDaysAgo(6)).order('started_at', { ascending: true }),
    // AI Engineer tab: finished roadmap weeks with their proof.
    supabase.from('roadmap_progress').select('week, proof_url, metric, notes, completed_at').eq('user_id', user.id).order('week'),
    getPrepSettings(supabase, user.id),
    getQuestionBank(supabase, user.id),
  ])
  const coverage = bankCoverage(bank, today)

  const stories = (storiesRes.data ?? []) as Story[]
  const readiness = computeReadinessMatrix((codingRes.data ?? []) as unknown as CodingHistoryRow[], stories, coverage.find(c => c.key === 'ai-native') ?? null,
    bank.filter(q => q.last_rating !== null).map(q => ({ category: q.category, topics: q.topics, rating: q.last_rating! })))
  // Empty (not an error) until the mock_rounds migration has run.
  const template = templateOf(settings.day_template)
  const mockRounds = (mockRes.data ?? []) as MockRound[]
  const weakness = topicWeakness(bank, today)

  let sessions = (sessionsRes.data ?? []) as PrepSession[]
  let todaySession = sessions.find(s => s.date === today) ?? null
  if (!todaySession) {
    // The recommended plan: the day template's minutes for this weekday.
    const blocks = planItems(today, template, {
      coverage,
      gaps: Object.fromEntries(BANK_CATEGORIES.map(c => [c.key, categoryGap(c.key, readiness)])),
      focusTopic: weakness.find(w => w.category === 'quiz')?.topic ?? null,
      mockDoneToday: mockRounds.some(r => toPrepDateStr(r.created_at) === today),
    })
    const { data: inserted } = await supabase.from('prep_sessions')
      .upsert({ user_id: user.id, date: today, focus: 'Today', blocks }, { onConflict: 'user_id,date', ignoreDuplicates: true })
      .select('*')
    todaySession = ((inserted ?? [])[0] as PrepSession | undefined) ?? null
    if (!todaySession) {
      const { data } = await supabase.from('prep_sessions').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
      todaySession = (data as PrepSession | null) ?? null
    }
    if (todaySession) sessions = [todaySession, ...sessions]
  }

  // Today on the clock: the plan's items laid into the template's sessions
  // from today's start, around an interview (dayplan.ts).
  const layout = layoutDay(todaySession?.blocks ?? [], template, todaySession?.start_min ?? settings.day_start_min, todaySession?.interview ?? null, todaySession?.breaks ?? [])

  return {
    today,
    session: todaySession,
    template,
    planned: layout.rows,
    dropped: layout.dropped,
    window: windowOf(layout.rows),
    streak: prepStreak(sessions, today),
    sessionsLast7: sessions.filter(s => s.date >= prepDaysAgo(6) && s.completed_at).length,
    // The 13 days before today, oldest first: % of each day's plan done (whole
    // blocks only — per-question partial credit isn't kept for past days).
    recentScores: Array.from({ length: 13 }, (_, i) => prepDaysAgo(13 - i)).map(date => {
      const s = sessions.find(x => x.date === date)
      return { date, score: s?.blocks.length ? dayPace(s.blocks, 99).donePct : null, good: !!s && isGoodDay(s.blocks) }
    }),
    mockRounds,
    // War Mode (all deterministic, war.ts).
    war: warReadiness(readiness, mockRounds),
    weakness: weakness.slice(0, 8),
    revision: revisionQueue(bank, today),
    focusSessions: (focusRes.data ?? []) as FocusSession[],
    roadmap: (roadmapRes.data ?? []) as RoadmapProgress[],
    stories,
    rehearsals: (rehearsalsRes.data ?? []) as StoryRehearsal[],
    readiness,
    settings,
    // Coverage + today's planned minutes per category, read from the stored
    // plan; quota = the questions that fit them (sizes the redo slots).
    coverage: coverage.map(c => {
      const b = todaySession?.blocks.find(x => x.key === `bank:${c.key}`)
      const minutes = b?.minutes ?? 0
      return { ...c, minutes, quota: minutes ? Math.max(1, Math.floor(minutes / minutesPerQuestion(c.key))) : 0 }
    }),
    bank,
  }
}

export async function getPrepSettings(supabase: SupabaseClient, userId: string): Promise<PrepSettings> {
  const { data } = await supabase.from('prep_settings').select('day_start_min, day_template').eq('user_id', userId).maybeSingle()
  return {
    day_start_min: data?.day_start_min ?? DEFAULT_TEMPLATE.sessions[0].start,
    day_template: (data?.day_template as PrepSettings['day_template']) ?? null,
  }
}

// PostgREST caps a response at 1,000 rows, and the bank is past that —
// page through it so no category gets silently truncated. Pages are read
// two at a time (the pool is ~1,200 rows, so usually one round trip).
type PoolRow = { id: string; title: string; difficulty: string; url: string | null; category: string; topics: string[] | null; sort_order: number | null; answer_hints: string | null; body: string | null }
async function fetchAllQuestions(supabase: SupabaseClient): Promise<PoolRow[]> {
  const PAGE = 1000
  const page = async (n: number) => {
    const { data, error } = await supabase.from('coding_questions')
      .select('id, title, difficulty, url, category, topics, sort_order, answer_hints, body').order('id').range(n * PAGE, n * PAGE + PAGE - 1)
    if (error) throw new Error(error.message)
    return (data ?? []) as PoolRow[]
  }
  const rows: PoolRow[] = []
  for (let n = 0; ; n += 2) {
    const [a, b] = await Promise.all([page(n), page(n + 1)])
    rows.push(...a, ...b)
    if (b.length < PAGE) return rows
  }
}

// The question pool is global (no user_id) and only changes when the seed
// scripts run, so it is cached for an hour across requests — the Prep page,
// the Daily bot and the crons all read it. Your own progress is never cached.
const questionPool = unstable_cache(() => fetchAllQuestions(createServiceClient()), ['prep-question-pool-v1'], { revalidate: 3600, tags: ['question-pool'] })

export async function getQuestionBank(supabase: SupabaseClient, userId: string): Promise<BankQuestion[]> {
  const [questions, { data: progress }, { data: coding }] = await Promise.all([
    questionPool(),
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
      doneToday: qs.filter(q => q.last_seen_at && toPrepDateStr(q.last_seen_at) === today).length,
      redoDue: qs.filter(q => isRedoDue(q, today)).length,
    }
  })
}

export async function updateBlocks(supabase: SupabaseClient, userId: string, date: string, fn: (blocks: PrepBlock[]) => PrepBlock[], closeActive = true): Promise<PrepSession | null> {
  const { data } = await supabase.from('prep_sessions').select('*').eq('user_id', userId).eq('date', date).maybeSingle()
  if (!data) return null
  const prev = data.blocks as PrepBlock[]
  const blocks = fn(prev)
  // A block turning done (quota met, ticked, Finish) completes the focus
  // session running on it, from any path — web, Telegram drill, mock round.
  const newlyDone = blocks.filter(b => b.done && !prev.find(p => p.key === b.key)?.done).map(b => b.key)
  if (closeActive && newlyDone.length > 0) {
    const active = await getActiveFocus(supabase, userId)
    if (active && active.date === date && newlyDone.includes(active.block_key)) await closeFocus(supabase, active, 'completed')
  }
  const allDone = blocks.length > 0 && blocks.every(b => b.done)
  const { data: updated } = await supabase.from('prep_sessions')
    .update({ blocks, completed_at: allDone ? (data.completed_at ?? new Date().toISOString()) : null })
    .eq('id', data.id).select('*').single()
  return (updated as PrepSession | null) ?? null
}

// Today's progress inputs for question blocks: answers per category and
// focused minutes per block (war.ts blockProgress).
async function progressToday(supabase: SupabaseClient, userId: string, categories: string[]): Promise<ProgressCtx> {
  const answered: Record<string, number> = {}
  const [{ data: answers }, { data: focus }] = await Promise.all([
    categories.length
      ? supabase.from('question_progress').select('question_id, coding_questions!inner(category)').eq('user_id', userId)
        .in('coding_questions.category', categories).gte('last_seen_at', prepDayStartUtc())
      : Promise.resolve({ data: [] }),
    supabase.from('prep_focus_sessions').select('*').eq('user_id', userId).eq('date', prepToday()),
  ])
  for (const row of (answers ?? []) as unknown as { coding_questions: { category: string } }[]) {
    answered[row.coding_questions.category] = (answered[row.coding_questions.category] ?? 0) + 1
  }
  return { answered, focused: focusedMinutes((focus ?? []) as FocusSession[], prepToday()) }
}

// Ticks question blocks that reached their planned minutes (answers ×
// minutes per question, or focused time). `extra` lets a caller tick more
// blocks in the same write. `categories` is kept for callers; every question
// block in today's plan is re-checked.
export async function syncBankBlocks(supabase: SupabaseClient, userId: string, categories: string[] = [], extra: (b: PrepBlock) => boolean = () => false): Promise<PrepSession | null> {
  const { data: session } = await supabase.from('prep_sessions').select('blocks').eq('user_id', userId).eq('date', prepToday()).maybeSingle()
  const planned = ((session?.blocks ?? []) as PrepBlock[]).filter(b => b.key.startsWith('bank:')).map(b => b.key.slice(5))
  const ctx = await progressToday(supabase, userId, [...new Set([...planned, ...categories])])
  return updateBlocks(supabase, userId, prepToday(), blocks => blocks.map(b => extra(b) || blockReached(b, ctx) ? { ...b, done: true } : b))
}


// Edit today, saved as a patch: one read, one write of only the changed
// columns, and a progress re-check only for question blocks whose minutes
// changed or that were added (2 queries, in parallel) — not every block.
export async function patchToday(supabase: SupabaseClient, userId: string, patch: TodayPatch): Promise<PrepSession> {
  const { data: row } = await supabase.from('prep_sessions').select('*').eq('user_id', userId).eq('date', prepToday()).maybeSingle()
  if (!row) throw new Error('Open Prep once to build today\'s plan')
  const cols: Record<string, unknown> = {}
  if (patch.startMin !== undefined) cols.start_min = patch.startMin
  if (patch.interview !== undefined) cols.interview = patch.interview
  if (patch.breaks !== undefined) cols.breaks = patch.breaks.length ? patch.breaks : null
  if (patchTouchesBlocks(patch)) {
    let blocks = applyTodayPatch(row.blocks as PrepBlock[], patch, row.date)
    const changed = new Set([...Object.keys(patch.minutes ?? {}), ...(patch.add ?? []).map(a => a.key)].filter(k => k.startsWith('bank:')))
    if (changed.size) {
      const ctx = await progressToday(supabase, userId, [...changed].map(k => k.slice(5)))
      blocks = blocks.map(b => changed.has(b.key) ? { ...b, done: blockReached({ ...b, done: false }, ctx) } : b)
    }
    cols.blocks = blocks
    cols.completed_at = blocks.length > 0 && blocks.every(b => b.done) ? (row.completed_at ?? new Date().toISOString()) : null
  }
  if (!Object.keys(cols).length) return row as PrepSession
  const { data, error } = await supabase.from('prep_sessions').update(cols).eq('id', row.id).select('*').single()
  if (error) throw new Error(error.message)
  return data as PrepSession
}


// ---------------- Focus sessions (War Mode) ----------------

export async function getActiveFocus(supabase: SupabaseClient, userId: string): Promise<FocusSession | null> {
  const { data } = await supabase.from('prep_focus_sessions').select('*').eq('user_id', userId).eq('status', 'active').order('started_at', { ascending: false }).limit(1).maybeSingle()
  return (data as FocusSession | null) ?? null
}

// Starts a focus session on a block of today's plan (the NOW block when no
// key is given — Telegram "start"). One active session at a time — an
// existing one is returned.
export async function startFocus(supabase: SupabaseClient, userId: string, blockKey?: string): Promise<FocusSession | null> {
  const today = prepToday()
  let { data: session } = await supabase.from('prep_sessions').select('blocks').eq('user_id', userId).eq('date', today).maybeSingle()
  if (!session) { await loadPrepData(supabase, userId); ({ data: session } = await supabase.from('prep_sessions').select('blocks').eq('user_id', userId).eq('date', today).maybeSingle()) }
  const blocks = (session?.blocks ?? []) as PrepBlock[]
  const block = blockKey ? blocks.find(b => b.key === blockKey) : nowBlock(blocks)
  if (!block) return getActiveFocus(supabase, userId)
  return startFocusOn(supabase, userId, block)
}

// The fast path (the web timer, which already has the block): two queries —
// the running session if any, else one insert.
export async function startFocusOn(supabase: SupabaseClient, userId: string, block: Pick<PrepBlock, 'key' | 'label' | 'minutes'>): Promise<FocusSession> {
  const active = await getActiveFocus(supabase, userId)
  if (active) return active
  const { data, error } = await supabase.from('prep_focus_sessions')
    .insert({ user_id: userId, date: prepToday(), block_key: block.key, label: block.label, planned_minutes: block.minutes })
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

// FocusBar Finish on a question block needs FINISH_SHARE of its minutes
// (time focused or answers × minutes per question). null = allowed.
export async function bankShortfall(supabase: SupabaseClient, userId: string, block: Pick<PrepBlock, 'key' | 'minutes' | 'done'>): Promise<{ minutes: number; planned: number } | null> {
  if (!block.key.startsWith('bank:')) return null
  const ctx = await progressToday(supabase, userId, [block.key.slice(5)])
  return canFinishBlock(block, ctx) ? null : { minutes: Math.floor(blockProgress(block, ctx)), planned: block.minutes }
}

// Finish = the block is done (ticked in today's plan); abandon = time is
// kept but the block stays open (unless that time took it to its minutes).
// Finishing a question block under FINISH_SHARE of its minutes is refused:
// the session keeps running and `short` says how far off it is.
// `verified`: the web timer already checked FINISH_SHARE on the client
// (canFinishBlock), so the server skips re-reading today's progress.
export async function endFocus(supabase: SupabaseClient, userId: string, id: string, finished: boolean, verified = false): Promise<{ focus: FocusSession | null; session: PrepSession | null; short?: { minutes: number; planned: number } }> {
  const { data: f } = await supabase.from('prep_focus_sessions').select('*').eq('id', id).eq('user_id', userId).single()
  if (!f || f.status !== 'active') return { focus: (f as FocusSession | null) ?? null, session: null }
  if (finished && !verified) {
    const { data: s } = await supabase.from('prep_sessions').select('blocks').eq('user_id', userId).eq('date', f.date).maybeSingle()
    const short = await bankShortfall(supabase, userId, (s?.blocks as PrepBlock[] | undefined)?.find(b => b.key === f.block_key) ?? { key: f.block_key, minutes: f.planned_minutes, done: false })
    if (short) return { focus: f as FocusSession, session: null, short }
  }
  const focus = await closeFocus(supabase, f as FocusSession, finished ? 'completed' : 'abandoned')
  const session = finished
    ? await updateBlocks(supabase, userId, f.date, blocks => blocks.map(b => b.key === f.block_key ? { ...b, done: true } : b), false)
    : f.block_key.startsWith('bank:') ? await syncBankBlocks(supabase, userId) : null
  return { focus, session }
}

async function closeFocus(supabase: SupabaseClient, f: FocusSession, status: 'completed' | 'abandoned'): Promise<FocusSession | null> {
  const { data } = await supabase.from('prep_focus_sessions')
    .update({ status, ended_at: new Date().toISOString(), actual_seconds: focusSeconds(f), paused_at: null })
    .eq('id', f.id).eq('status', 'active').select('*').maybeSingle()
  return (data as FocusSession | null) ?? null
}
