'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { askAI } from '@/lib/ai-gateway'
import { formatOf, roundScore, type MockFormat, type MockItem, type MockReview, type MockRound } from './mock'
import { COMPETENCIES } from './types'
import type { PrepBlock, PrepSession, Story, StoryRehearsal } from './types'
import { endFocus, getQuestionBank, interviewOf, loadPrepData, patchToday, startFocusOn, syncBankBlocks, toggleFocusPause } from './core'
import { matchJD, type InterviewPlan, type InterviewPrep, type JdMatch } from './jd'
import type { FocusSession } from './war'
import { ORDER, frontLoad, type DayTemplate, type TodayPatch } from './dayplan'
import { ROADMAP, buildBlock, learnBlock, type RoadmapProgress, type RoadmapStepDone } from './roadmap'
import { prepToday } from '@/lib/date'
import { critiqueFollowUp, critiqueQuestion, critiqueStory, modelAnswer, SPOKEN_NOTE } from './critique'
import type { Rubric, Scorecard } from './scorecard'
import { speechStats } from '@/lib/speech-stats'

export async function getPrepData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return loadPrepData(supabase, user.id)
}

// ---------------- Focus sessions (War Mode) ----------------

// The focus timer actions don't revalidate the page: the client already
// holds the new state (optimistic), and a page refresh re-runs every Prep
// query — that was what made Start / Pause / Stop feel slow.
export async function startFocusSession(block: { key: string; label: string; minutes: number }): Promise<FocusSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return startFocusOn(supabase, user.id, block)
}

export async function toggleFocusSessionPause(id: string): Promise<FocusSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return toggleFocusPause(supabase, user.id, id)
}

export async function endFocusSession(id: string, finished: boolean): Promise<{ focus: FocusSession | null; session: PrepSession | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return endFocus(supabase, user.id, id, finished, true)
}

// ---------------- Today + the day template (Edit → Save) ----------------

const isMinute = (m: unknown): m is number => Number.isInteger(m) && (m as number) >= 0 && (m as number) <= 1439

// Edit today, sent as a patch of only what changed (dayplan.ts TodayPatch);
// patchToday() applies it in one read + one write. The page has already
// applied it optimistically.
const isMinutes = (m: unknown) => Number.isInteger(m) && (m as number) >= 5 && (m as number) <= 300
export async function savePrepToday(patch: TodayPatch): Promise<PrepSession> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (patch.startMin !== undefined && !isMinute(patch.startMin)) throw new Error('Invalid start time')
  const iv = patch.interview
  if (iv && (!Number.isInteger(iv.start) || iv.start < 0 || iv.start > 1800 || !Number.isInteger(iv.minutes) || iv.minutes < 15 || iv.minutes > 240)) throw new Error('Invalid interview time')
  if (patch.breaks && (patch.breaks.length > 10 || patch.breaks.some(b => !Number.isInteger(b.start) || !Number.isInteger(b.end) || b.start < 0 || b.end > 1800 || b.end <= b.start || b.end - b.start > 240 || (b.meal !== undefined && (!Number.isInteger(b.meal) || b.meal < 0 || b.meal > 5))))) throw new Error('Each break or meal needs a start before its end (up to 4 hours)')
  if (patch.add && (patch.add.length > 30 || patch.add.some(a => !isMinutes(a.minutes) || !(a.key.startsWith('custom:') ? a.label?.trim() : (ORDER as readonly string[]).includes(a.key))))) throw new Error('Check the added slots')
  if (patch.minutes && Object.values(patch.minutes).some(m => !isMinutes(m))) throw new Error('Slots are 5–300 minutes')
  if (patch.order && new Set(patch.order).size !== patch.order.length) throw new Error('Each slot can appear once')
  return patchToday(supabase, user.id, {
    ...patch,
    ...(patch.breaks ? { breaks: patch.breaks.map(b => ({ start: b.start, end: b.end, ...(b.label?.trim() ? { label: b.label.trim() } : {}), ...(b.meal !== undefined ? { meal: b.meal } : {}) })) } : {}),
  })
}

// Edit default plan: the day template (sessions, gaps, minutes per slot a
// day) and the default start. Applies from tomorrow's plan;
// today's times re-lay with the new sessions and breaks.
export async function savePrepTemplate(template: DayTemplate, dayStartMin: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!isMinute(dayStartMin)) throw new Error('Invalid start time')
  const sessions = template.sessions
  if (!sessions.length || sessions.length > 6) throw new Error('1–6 sessions')
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i]
    if (!s.label?.trim() || !Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end > 1800 || s.end <= s.start) throw new Error(`Check the times of "${s.label || `session ${i + 1}`}"`)
    if (i > 0 && s.start < sessions[i - 1].end) throw new Error('Sessions must not overlap')
  }
  if (!template.minutes || Object.entries(template.minutes).some(([k, v]) => !(ORDER as readonly string[]).includes(k) || !Number.isInteger(v) || v < 0 || v > 300)) throw new Error('Check the minutes per day')
  const clean: DayTemplate = {
    sessions: sessions.map(s => ({ label: s.label.trim(), start: s.start, end: s.end })),
    gaps: template.gaps.slice(0, sessions.length - 1).map(g => g.trim() || 'Break'),
    minutes: Object.fromEntries(Object.entries(template.minutes).filter(([, v]) => v > 0)),
  }
  const { error } = await supabase.from('prep_settings')
    .upsert({ user_id: user.id, day_template: clean, day_start_min: dayStartMin, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
  revalidatePath('/dashboard')
}

// AI interviewer feedback on a typed Question Bank answer (reviewing the
// user's own work — uncached, every answer differs): a scorecard whose 1–10
// rating is computed in code (critique.ts). The rubric depends on the
// category; `spoken` = dictated via Speak. Not stored; the answer and rating
// are saved when you hit Next.
export async function critiqueAnswer(questionId: string, answer: string, spoken = false): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { seconds, fillers } = speechStats(answer)
  return critiqueQuestion(supabase, user.id, questionId, answer, spoken ? SPOKEN_NOTE(seconds, fillers) : '')
}

// Model answer for a Question Bank question (the "Answer" button) — cached a
// year per question by the gateway.
export async function revealModelAnswer(questionId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return modelAnswer(supabase, user.id, questionId)
}

// Grades the user's answer to a review's follow-up question. Practice only —
// nothing is stored and the original question's rating is untouched.
export async function critiqueFollowUpAnswer(rubric: Rubric, original: string, followUp: string, answer: string, spoken = false): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { seconds, fillers } = speechStats(answer)
  return critiqueFollowUp(user.id, rubric, original, followUp, answer, spoken ? SPOKEN_NOTE(seconds, fillers) : '')
}

// Records a Question Bank answer (the question counts as practiced); the
// matching question block auto-completes once its planned minutes are reached.
export async function answerQuestion(questionId: string, answer: string | null, rating: number | null = null): Promise<PrepSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: q }, { data: prev }] = await Promise.all([
    supabase.from('coding_questions').select('id, category').eq('id', questionId).single(),
    supabase.from('question_progress').select('attempts, last_answer').eq('user_id', user.id).eq('question_id', questionId).maybeSingle(),
  ])
  if (!q) throw new Error('Question not found')
  const { error } = await supabase.from('question_progress').upsert({
    user_id: user.id, question_id: questionId,
    attempts: (prev?.attempts ?? 0) + 1, last_answer: answer || prev?.last_answer || null, last_seen_at: new Date().toISOString(),
    // The AI review's rating, when one was run before Next.
    ...(rating !== null ? { last_rating: rating, last_rated_at: new Date().toISOString() } : {}),
  }, { onConflict: 'user_id,question_id' })
  if (error) throw new Error(error.message)

  const session = await syncBankBlocks(supabase, user.id, [q.category])
  revalidatePath('/prep')
  return session
}

// Saves a finished Mock Round: each answered (not skipped) bank question
// counts as practiced in question_progress, the round goes into mock_rounds,
// and today's mock block auto-completes. Answers are never stored — only the
// questions, times and (after reviewMockRound) the review and its scores.
export async function saveMockRound(format: MockFormat, items: MockItem[], durationSeconds: number): Promise<{ round: MockRound; session: PrepSession | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (items.length === 0) throw new Error('Empty round')
  const now = new Date().toISOString()

  const answered = items.filter(i => i.question_id && !i.skipped)
  if (answered.length > 0) {
    const ids = answered.map(i => i.question_id!)
    const { data: prev } = await supabase.from('question_progress').select('question_id, attempts').eq('user_id', user.id).in('question_id', ids)
    const prevById = new Map((prev ?? []).map(p => [p.question_id, p]))
    const { error } = await supabase.from('question_progress').upsert(answered.map(i => ({
      user_id: user.id, question_id: i.question_id!,
      attempts: (prevById.get(i.question_id!)?.attempts ?? 0) + 1,
      last_seen_at: now,
    })), { onConflict: 'user_id,question_id' })
    if (error) throw new Error(error.message)
  }

  const { data: round, error } = await supabase.from('mock_rounds')
    .insert({ user_id: user.id, format, items: items.map(i => ({ ...i, answer: '' })), duration_seconds: Math.max(0, Math.round(durationSeconds)) })
    .select('id, format, items, duration_seconds, created_at, review').single()
  if (error) throw new Error(error.message)

  const session = await syncBankBlocks(supabase, user.id, [...new Set(answered.map(i => i.category))], b => b.key === 'mock')
  revalidatePath('/prep')
  revalidatePath('/dashboard')
  return { round: round as MockRound, session }
}

const MOCK_REVIEW_SYSTEM = `You are a senior interviewer (Senior Frontend Engineer / AI Product Engineer loop, at a company that expects AI-native engineers) reviewing a candidate's whole mock interview round at once.
For each question judge the typed answer by its kind: theory / UI coding / system design / AI system design and AI engineering (RAG, agents, MCP, evals) — technical correctness first (call out anything wrong), then depth, trade-offs and missing key points; behavioral / STAR — directness, structure (situation, what THEY did, measurable result), evidence and tone; AI-native — their own judgment and verification of AI output, a concrete example, honest limits. Use the listed key points as the rubric. Note answers that ran far over their time budget.
Rate every judged answer 1-10 as a hiring bar for this level: 9-10 = strong hire answer, 7-8 = solid, 5-6 = borderline (gaps or shallow), 3-4 = weak (wrong or missing key points), 1-2 = no real answer. Use null for answers you can't judge (skipped, or given out loud and not typed).
If an answer is marked as given out loud (not typed), say you can't judge it and suggest typing the gist next time. If it is marked skipped, say what a strong answer would have covered in one line.
Respond with ONLY a JSON object, no prose before or after:
{"verdict":"Strong" | "Good" | "Needs work","outcome":"Likely pass" | "Borderline" | "Likely no","summary":"2 sentences on the round overall","strengths":["up to 2 short points"],"fixes":["up to 3 specific, actionable fixes, most important first"],"ratings":[one integer 1-10 or null per question, in order],"notes":["one note per question, in order, each 1-3 sentences"]}`

const parseList = (v: unknown) => Array.isArray(v) ? v.map(String).filter(Boolean) : []

// The AI review of a saved round, stored on the row so the calendar can show
// it again for free: one Haiku call for the whole round, or (code-review and
// code-review) one scorecard per answer.
// The answers come from the page (they're never stored), so a round can be
// reviewed only right after it, while the page still holds them.
export async function reviewMockRound(roundId: string, answers: string[]): Promise<{ review: MockReview | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: round } = await supabase.from('mock_rounds').select('format, items, review').eq('id', roundId).eq('user_id', user.id).single()
  if (!round) throw new Error('Round not found')
  if (round.review) return { review: round.review as MockReview, error: null }

  const stored = round.items as MockItem[]
  if (answers.length !== stored.length) throw new Error('Answers don\'t match the round')
  const items = stored.map((it, i) => ({ ...it, answer: String(answers[i] ?? '').slice(0, 20000) }))
  const review = SCORECARD_FORMATS.has(round.format)
    ? await scorecardRoundReview(supabase, user.id, items)
    : await wholeRoundReview(user.id, round.format, items)
  if (typeof review === 'string') return { review: null, error: review }
  const { ratings } = review
  const { error } = await supabase.from('mock_rounds').update({ review }).eq('id', roundId)
  if (error) throw new Error(error.message)
  // Each rated bank answer's rating also lands on its question, so topic
  // weakness and readiness see mock performance.
  const ratedAt = new Date().toISOString()
  await Promise.all(items.map((it, i) => it.question_id && ratings[i] !== null
    ? supabase.from('question_progress').update({ last_rating: ratings[i], last_rated_at: ratedAt }).eq('user_id', user.id).eq('question_id', it.question_id)
    : null))
  revalidatePath('/prep')
  return { review, error: null }
}

// Code-review rounds are graded answer by answer with the shared scorecard
// (their key points are the planted issues), and
// the round's verdict is derived from the computed ratings.
const SCORECARD_FORMATS = new Set(['code-review'])

async function scorecardRoundReview(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, items: MockItem[]): Promise<MockReview | string> {
  const graded = await Promise.all(items.map(it => it.question_id && !it.skipped && it.answer.trim() ? critiqueQuestion(supabase, userId, it.question_id, it.answer.trim()) : null))
  if (graded.every(g => g === null)) return 'Nothing typed to review — type your answers next time.'
  const cards = graded.map(g => g?.card ?? null)
  const ratings = graded.map(g => g?.rating ?? null)
  const score = roundScore(ratings)
  const got = cards.filter((c): c is Scorecard => c !== null)
  return {
    verdict: score === null ? 'Needs work' : score >= 8 ? 'Strong' : score >= 6 ? 'Good' : 'Needs work',
    outcome: score === null ? 'Borderline' : score >= 7 ? 'Likely pass' : score >= 5 ? 'Borderline' : 'Likely no',
    summary: got.map(c => c.summary).join(' '),
    strengths: got.flatMap(c => c.points.filter(p => p.status === 'covered').map(p => p.point)).slice(0, 2),
    fixes: got.flatMap(c => c.fixes).slice(0, 3),
    notes: graded.map((g, i) => g ? (g.card ? `${g.card.verdict} — ${g.card.summary}` : g.feedback) : items[i].skipped ? 'Skipped.' : 'Not typed — can\'t be graded.'),
    ratings, score, cards,
  }
}

// Every other format: one Haiku call reviews the whole round.
async function wholeRoundReview(userId: string, format: string, items: MockItem[]): Promise<MockReview | string> {
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const prompt = `Round: ${formatOf(format).label}, ${items.length} questions.\n\n` + items.map((it, i) => [
    `Q${i + 1} [${it.category === 'star' ? 'STAR story' : it.category}] ${it.prompt}`,
    it.hints ? `Key points: ${it.hints}` : null,
    `Time: ${mm(it.seconds)} of ${mm(it.budget_seconds)}`,
    `Answer: ${it.skipped ? '[skipped]' : it.answer.trim() || '[answered out loud — not typed]'}`,
  ].filter(Boolean).join('\n')).join('\n\n')

  const raw = await askAI('mock_round_review', prompt, MOCK_REVIEW_SYSTEM, { userId })
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  let parsed: Record<string, unknown>
  try { parsed = JSON.parse(json) } catch { return raw.startsWith('{') ? 'The review came back malformed — try again.' : raw }
  const rawRatings = Array.isArray(parsed.ratings) ? parsed.ratings : []
  // Clamp to 1–10; skipped / untyped answers are never rated, whatever the AI says.
  const ratings = items.map((it, i) => {
    const n = Number(rawRatings[i])
    return it.skipped || !it.answer.trim() || !Number.isFinite(n) || rawRatings[i] === null ? null : Math.min(10, Math.max(1, Math.round(n)))
  })
  return {
    verdict: String(parsed.verdict ?? ''), outcome: String(parsed.outcome ?? ''), summary: String(parsed.summary ?? ''),
    strengths: parseList(parsed.strengths), fixes: parseList(parsed.fixes),
    notes: items.map((_, i) => parseList(parsed.notes)[i] ?? ''),
    ratings, score: roundScore(ratings),
  }
}

export type StoryInput = Pick<Story, 'title' | 'competencies' | 'situation' | 'task' | 'action' | 'result' | 'metrics' | 'strength'>

export async function saveStory(id: string | null, input: StoryInput): Promise<Story> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const row = { ...input, updated_at: new Date().toISOString() }
  const { data, error } = id
    ? await supabase.from('stories').update(row).eq('id', id).select('*').single()
    : await supabase.from('stories').insert({ ...row, user_id: user.id }).select('*').single()
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
  return data as Story
}

export async function deleteStory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
}

// Story Bank rehearsal: graded with the shared scorecard (critique.ts,
// `story` rubric) and stored with its computed rating.
export async function rehearseStory(competency: string, prompt: string, answer: string, storyId: string | null, spoken = false): Promise<StoryRehearsal> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const label = COMPETENCIES.find(c => c.key === competency)?.label ?? competency
  const { seconds, fillers } = speechStats(answer)
  const { rating, feedback, card } = await critiqueStory(user.id, label, prompt, answer, spoken ? SPOKEN_NOTE(seconds, fillers) : '')
  const { data, error } = await supabase.from('story_rehearsals')
    .insert({ user_id: user.id, story_id: storyId, competency, prompt, answer, critique: feedback, rating, scorecard: card })
    .select('id, story_id, competency, prompt, answer, critique, rating, scorecard, created_at').single()
  if (error) throw new Error(error.message)
  if (storyId) await supabase.from('stories').update({ last_rehearsed_at: new Date().toISOString() }).eq('id', storyId)
  revalidatePath('/prep')
  return data as StoryRehearsal
}

// ---------------- AI Engineer tab: roadmap progress ----------------

// Marks a roadmap week shipped with its proof (or updates it). Only http(s)
// proof links are kept, since they render as links.
export async function saveRoadmapWeek(week: number, input: { proof_url: string; metric: string; notes: string }): Promise<RoadmapProgress> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (!Number.isInteger(week) || week < 1 || week > ROADMAP.length) throw new Error('Unknown week')
  const url = input.proof_url.trim()
  if (url && !/^https?:\/\//i.test(url)) throw new Error('Proof link must start with http:// or https://')
  const { data, error } = await supabase.from('roadmap_progress')
    .upsert({ user_id: user.id, week, proof_url: url || null, metric: input.metric.trim() || null, notes: input.notes.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id,week' })
    .select('week, proof_url, metric, notes, completed_at').single()
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
  return data as RoadmapProgress
}

export async function undoRoadmapWeek(week: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('roadmap_progress').delete().eq('user_id', user.id).eq('week', week)
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
}

// Ticks (or unticks) one step of a roadmap week, then points today's Learn /
// Build blocks at the week's next step (their minutes and done stay).
export async function setRoadmapStep(week: number, step: number, done: boolean): Promise<RoadmapStepDone[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const w = ROADMAP.find(x => x.week === week)
  if (!w || !Number.isInteger(step) || step < 0 || step >= w.steps.length) throw new Error('Unknown step')
  const res = done
    ? await supabase.from('roadmap_steps').upsert({ user_id: user.id, week, step, done_at: new Date().toISOString() }, { onConflict: 'user_id,week,step' })
    : await supabase.from('roadmap_steps').delete().eq('user_id', user.id).eq('week', week).eq('step', step)
  if (res.error) throw new Error(res.error.message)
  const { data: rows } = await supabase.from('roadmap_steps').select('week, step, done_at').eq('user_id', user.id)
  const steps = (rows ?? []) as RoadmapStepDone[]
  const today = prepToday()
  const { data: session } = await supabase.from('prep_sessions').select('id, blocks').eq('user_id', user.id).eq('date', today).maybeSingle()
  if (session) {
    const blocks = (session.blocks as PrepBlock[]).map(b => {
      const fresh = b.key === 'learn' ? learnBlock(today, b.minutes, steps) : b.key === 'build' ? buildBlock(today, b.minutes, steps) : null
      return fresh ? { ...fresh, minutes: b.minutes, done: b.done } : b
    })
    await supabase.from('prep_sessions').update({ blocks }).eq('id', session.id)
  }
  revalidatePath('/prep')
  return steps
}

// ---------------- Interview prep from a job description ----------------

const INTERVIEW_PLAN_SYSTEM = `You are a senior interviewer and interview coach preparing a candidate for a specific interview.
The candidate: Senior Frontend Engineer (React, Next.js, TypeScript; also Angular), moving toward AI Product Engineer roles (backend & APIs, system design, RAG, agents, evals).
From the job description and context, write a focused prep plan for THIS interview. Be specific to the JD and the company, never generic filler.
"knownFor": what this company is known to ask or emphasise in interviews for roles like this, from your own knowledge. Only include what you are reasonably confident about; it may be dated, and it is shown labelled as such. Empty list if you don't know the company.
"timeline": a schedule from now until the interview start, using the times given, in short blocks (e.g. "Tonight 9:00–10:00pm"), ending with a 30-minute warm-up before the start. Prioritise the candidate's gaps.
Respond with ONLY a JSON object, no prose before or after:
{"roleRead":"2 sentences: what this role really is and the level","focusAreas":[{"area":"...","why":"..."}],"rounds":[{"name":"...","what":"..."}],"questions":[{"q":"...","type":"technical"|"system-design"|"coding"|"behavioral"|"culture","why":"which JD line it comes from"}],"knownFor":["..."],"askThem":["..."],"prepareFor":["gaps or weak spots to prepare an answer for"],"timeline":[{"when":"...","what":"..."}]}
4-6 focusAreas, 2-5 rounds, 14-18 questions, 3-5 askThem, 2-5 prepareFor.`

const istLabel = (date: string, min: number | null) => {
  if (min === null) return date
  const h = Math.floor(min / 60) % 24, m = min % 60
  return `${date} ${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'} IST`
}
const nowIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') + ' IST'

async function interviewPlan(userId: string, p: { company: string; role: string | null; round: string | null; jd: string; interview_date: string; start_min: number | null; minutes: number }, matched: JdMatch, storyTitles: string[]): Promise<{ plan: InterviewPlan | null; error: string | null }> {
  const pct = (g: JdMatch['gaps'][number]) => g.total ? Math.round(g.seen / g.total * 100) : 0
  const prompt = [
    `Company: ${p.company}`, `Role: ${p.role ?? 'not given'}`, `Round: ${p.round ?? 'not given'}`,
    `Interview: ${istLabel(p.interview_date, p.start_min)} (${p.minutes} min). Now: ${nowIST()}.`,
    `JD skills found: ${matched.skills.map(s => s.label).join(', ') || 'none recognised'}`,
    `Candidate's practice per matched area (share of bank practised, average answer rating /10): ${matched.gaps.map(g => `${g.category} ${pct(g)}%${g.avgRating !== null ? `, ${g.avgRating}/10` : ''}`).join('; ') || 'n/a'}`,
    `Candidate's prepared stories: ${storyTitles.join('; ') || 'none'}`,
    '', 'Job description:', p.jd.slice(0, 12000),
  ].join('\n')
  const raw = await askAI('interview_plan', prompt, INTERVIEW_PLAN_SYSTEM, { userId })
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  let o: Record<string, unknown>
  try { o = JSON.parse(json) } catch { return { plan: null, error: raw.startsWith('{') || !raw.trim() ? 'The AI plan came back malformed — try again.' : raw } }
  const arr = <T,>(v: unknown, f: (x: Record<string, unknown>) => T): T[] => Array.isArray(v) ? v.filter(x => x && typeof x === 'object').map(x => f(x as Record<string, unknown>)) : []
  const strs = (v: unknown) => Array.isArray(v) ? v.map(String).filter(Boolean) : []
  return {
    error: null,
    plan: {
      roleRead: String(o.roleRead ?? ''),
      focusAreas: arr(o.focusAreas, x => ({ area: String(x.area ?? ''), why: String(x.why ?? '') })),
      rounds: arr(o.rounds, x => ({ name: String(x.name ?? ''), what: String(x.what ?? '') })),
      questions: arr(o.questions, x => ({ q: String(x.q ?? ''), type: String(x.type ?? 'technical'), why: String(x.why ?? '') })).filter(x => x.q),
      knownFor: strs(o.knownFor), askThem: strs(o.askThem), prepareFor: strs(o.prepareFor),
      timeline: arr(o.timeline, x => ({ when: String(x.when ?? ''), what: String(x.what ?? '') })),
    },
  }
}

export interface InterviewPrepInput { company: string; role: string; round: string; jd: string; date: string; startMin: number | null; minutes: number }

// Paste a JD → the deterministic match (jd.ts), one AI plan, saved; an
// interview today also re-shapes today's plan (its slot, its categories
// first). Later days pick it up when their plan is built (core.ts).
export async function createInterviewPrep(input: InterviewPrepInput): Promise<{ prep: InterviewPrep; session: PrepSession | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const company = input.company.trim().slice(0, 100)
  const jd = input.jd.trim().slice(0, 30000)
  if (!company) throw new Error('Add the company')
  if (jd.length < 80) throw new Error('Paste the full job description')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Pick the interview date')
  if (input.startMin !== null && (!Number.isInteger(input.startMin) || input.startMin < 0 || input.startMin > 1439)) throw new Error('Invalid interview time')
  if (!Number.isInteger(input.minutes) || input.minutes < 15 || input.minutes > 240) throw new Error('Interview length is 15–240 minutes')

  const [bank, { data: stories }] = await Promise.all([
    getQuestionBank(supabase, user.id),
    supabase.from('stories').select('*').eq('user_id', user.id),
  ])
  const matched = matchJD(jd, bank, (stories ?? []) as Story[])
  const row = { company, role: input.role.trim() || null, round: input.round.trim() || null, jd, interview_date: input.date, start_min: input.startMin, minutes: input.minutes }
  const { plan, error } = await interviewPlan(user.id, row, matched, ((stories ?? []) as Story[]).map(s => s.title))
  const { data, error: dbError } = await supabase.from('interview_preps').insert({ user_id: user.id, ...row, matched, plan }).select('*').single()
  if (dbError) throw new Error(dbError.message)

  let session: PrepSession | null = null
  if (input.date === prepToday()) {
    const { data: today } = await supabase.from('prep_sessions').select('*').eq('user_id', user.id).eq('date', input.date).maybeSingle()
    if (today) {
      const { data: updated } = await supabase.from('prep_sessions')
        .update({ blocks: frontLoad(today.blocks as PrepBlock[], matched.categories), ...(input.startMin !== null ? { interview: interviewOf(row) } : {}) })
        .eq('id', today.id).select('*').single()
      session = (updated as PrepSession | null) ?? null
    }
  }
  revalidatePath('/prep')
  return { prep: data as InterviewPrep, session, error }
}

// Re-runs the AI plan for a saved prep (after a budget or parse failure).
export async function retryInterviewPlan(id: string): Promise<{ prep: InterviewPrep | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const [{ data: p }, { data: stories }] = await Promise.all([
    supabase.from('interview_preps').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('stories').select('title').eq('user_id', user.id),
  ])
  if (!p) throw new Error('Prep not found')
  const prep = p as InterviewPrep
  const { plan, error } = await interviewPlan(user.id, prep, prep.matched ?? matchJD(prep.jd, [], []), (stories ?? []).map(s => s.title as string))
  if (!plan) return { prep: null, error }
  const { data } = await supabase.from('interview_preps').update({ plan, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  revalidatePath('/prep')
  return { prep: data as InterviewPrep, error: null }
}

export async function deleteInterviewPrep(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('interview_preps').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/prep')
}
