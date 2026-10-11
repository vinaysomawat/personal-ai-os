import type { SupabaseClient } from '@supabase/supabase-js'
import { askAI } from '@/lib/ai-gateway'
import { CRITERIA, type PointStatus, type Rubric, type Scorecard } from './scorecard'

// AI interviewer critique of one Question Bank answer — shared by the web
// Question Bank (critiqueAnswer) and the Telegram voice drill. Plain module,
// not 'use server', so it isn't a publicly callable action.
//
// The AI only judges (a JSON scorecard: key points covered/partial/missing
// plus three small criterion scores); the 1–10 rating is computed here
// (scoreCard), so it tracks what the answer actually covered instead of
// drifting to the middle of the scale.

const JSON_SHAPE = `Respond with ONLY a JSON object, no prose around it:
{"points":[{"point":"<key point, ≤8 words>","status":"covered|partial|missing","note":"<≤15 words: what was said or what's missing; empty if fully covered>"}],
"correctness":0|1|2,"depth":0|1|2,"clarity":0|1,
"summary":"<one sentence: the overall judgement and why>",
"fixes":["<specific, actionable point>"],"followUp":"<one probing follow-up question>"}
Rules: "points" — if key points are listed, use exactly those (split a "·"- or comma-separated list into separate points, at most 8); otherwise list the 4–6 points a strong senior answer must hit. "covered" = stated clearly and correctly; "partial" = mentioned vaguely, incompletely, or with an error; "missing" = absent. Judge each point strictly and independently — do not round toward the middle. "fixes": 2–3 items. Plain text inside strings; wrap code identifiers in backticks.`

const TECHNICAL_SYSTEM = `You are a senior frontend interviewer at a top product company grading one answer to a frontend theory, Angular, UI-coding design, system-design, or algorithm question.
Scores: correctness — 2 = no technical errors, 1 = minor slips or imprecision, 0 = a major factual error or a fundamentally wrong explanation. depth — 2 = explains the why plus trade-offs and what a senior adds (performance, accessibility, testing, edge cases), 1 = some why, 0 = only the what. clarity — 1 = structured and easy to follow, 0 = rambling or hard to follow.
${JSON_SHAPE}`

const BEHAVIORAL_SYSTEM = `You are a hiring manager for a Senior Frontend Engineer / Frontend Tech Lead role grading one answer to a general or fit question. The candidate was recently laid off.
Scores: correctness ("no red flags") — 2 = none, 1 = a mild one (over-explaining, slight negativity, vague salary dodge), 0 = a serious one (blame, oversharing about the layoff, off-topic). depth ("evidence") — 2 = specific outcomes with numbers or concrete examples, 1 = some specifics, 0 = generic claims. clarity ("direct & concise") — 1 = answers the actual question in the first sentence and fits 60–120 s spoken, 0 = otherwise.
When no key points are listed, the points are what a strong senior/lead answer to this question must contain.
${JSON_SHAPE}`

const AI_NATIVE_SYSTEM = `You are a senior engineer interviewing for a Senior Frontend Engineer role at an AI-native company. The bar: engineers form their own hypotheses, pressure-test AI output, catch and explain AI mistakes, verify with evidence (tests, profiling, reading the code, reproducing), and own final quality.
Scores: correctness ("judgment") — 2 = the candidate's judgment clearly leads and verification is explicit, 1 = some verification but vague ("I check it"), 0 = blind trust or generic "AI makes me faster". depth ("real example") — 2 = a concrete real example (tool, task, what went wrong or right), 1 = a thin or hypothetical example, 0 = none. clarity — 1 = structured, 0 = rambling.
${JSON_SHAPE}`

const STORY_SYSTEM = `You are a senior engineering manager interviewing for a Frontend Tech Lead / Senior UI Engineer role, grading one STAR story told in answer to a behavioral question about a specific competency.
Scores: correctness ("own contribution") — 2 = the candidate's own actions and decisions are unmistakable ("I"), 1 = mixed "I"/"we", 0 = only "we" or the team's work. depth ("evidence") — 2 = concrete outcomes with numbers (time, %, users, money, incidents), 1 = a concrete but unquantified result, 0 = vague or no result. clarity ("concise") — 1 = structured STAR that fits ~2 minutes spoken (≈200–330 words), 0 = rambling, far too long, or too thin.
${JSON_SHAPE}`

const CODE_REVIEW_SYSTEM = `You are a staff frontend engineer grading a candidate's review of an AI-generated pull request (the diff is included). The key points are the issues planted in the diff.
A point is "covered" only if the candidate names the issue and why it matters; "partial" if they point at the right line but misdiagnose it or only half-explain it; "missing" otherwise. Valid extra findings are fine; do not count them as points.
Scores: correctness ("findings correct") — 2 = every claim is right, 1 = some wrong or nitpick-as-bug claims, 0 = major misreads of the code. depth ("severity & prioritization") — 2 = issues ranked by impact (security and correctness before style) with the impact explained, 1 = partly, 0 = a flat list or nitpicks first. clarity ("fix quality") — 1 = concrete, correct fixes, 0 = vague or wrong fixes.
${JSON_SHAPE}`

const AI_ASSISTED_SYSTEM = `You are a senior engineer grading an AI-assisted coding round (the Meta / Google 2026 format): the candidate worked in an unfamiliar multi-file codebase with an AI assistant through three stages — fix the planted bugs, add a feature, optimize/harden — and wrote up what changed per stage, the bugs they found and how they verified each, and the AI suggestions they rejected and why. The key points are the planted bugs, the expected feature and the expected optimizations.
A bug point is "covered" only if they name the root cause (not just the symptom) and a correct fix; "partial" for the right area with a vague or symptom-only fix. Feature / optimization points are "covered" when what they built matches.
Scores: correctness ("verification") — 2 = every claimed fix comes with concrete evidence (reproduced first, a test, the Network panel, a log, a manual repro with steps), 1 = some verification, 0 = fixes asserted with no evidence. depth ("AI judgment") — 2 = they caught at least one wrong, risky or incomplete AI suggestion and explain why they rejected it, 1 = generic caution, 0 = accepted AI output wholesale or says nothing about it. clarity ("explanation") — 1 = clear per-stage account, 0 = vague. Penalize accepting AI output without verification: when the write-up shows no verification at all, correctness must be 0.
${JSON_SHAPE}`

const SYSTEMS: Record<Rubric, string> = { technical: TECHNICAL_SYSTEM, behavioral: BEHAVIORAL_SYSTEM, 'ai-native': AI_NATIVE_SYSTEM, story: STORY_SYSTEM, 'code-review': CODE_REVIEW_SYSTEM, 'ai-assisted': AI_ASSISTED_SYSTEM }

// Coverage weighs most; a major error caps at 4, covering under a third of the
// key points caps at 5. Correctness and clarity only earn full credit once
// half the points are touched — a one-liner isn't "correct and clear".
export function scoreCard(c: Pick<Scorecard, 'points' | 'correctness' | 'depth' | 'clarity'>): number {
  const n = c.points.length
  const coverage = n ? c.points.reduce((s, p) => s + (p.status === 'covered' ? 1 : p.status === 'partial' ? 0.5 : 0), 0) / n : 0.5
  const substance = Math.min(1, coverage * 2)
  let rating = Math.round(1 + 9 * (0.55 * coverage + substance * (0.25 * (c.correctness / 2) + 0.08 * c.clarity) + 0.12 * (c.depth / 2)))
  if (c.correctness === 0) rating = Math.min(rating, 4)
  if (coverage < 1 / 3) rating = Math.min(rating, 5)
  return Math.min(10, Math.max(1, rating))
}

const int = (v: unknown, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0 }
const STATUSES: PointStatus[] = ['covered', 'partial', 'missing']

function parseScorecard(raw: string, rubric: Rubric): Scorecard | null {
  let j: Record<string, unknown>
  try { j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) } catch { return null }
  const points = (Array.isArray(j.points) ? j.points : []).slice(0, 8).map(p => {
    const o = (p ?? {}) as Record<string, unknown>
    const status = STATUSES.includes(o.status as PointStatus) ? o.status as PointStatus : 'missing'
    return { point: String(o.point ?? '').trim(), status, note: String(o.note ?? '').trim() }
  }).filter(p => p.point)
  if (points.length === 0) return null
  return {
    rubric, points,
    verdict: 'Needs work', // set from the computed rating
    summary: String(j.summary ?? '').trim(),
    correctness: int(j.correctness, 2) as 0 | 1 | 2,
    depth: int(j.depth, 2) as 0 | 1 | 2,
    clarity: int(j.clarity, 1) as 0 | 1,
    fixes: (Array.isArray(j.fixes) ? j.fixes : []).map(String).map(s => s.trim()).filter(Boolean).slice(0, 4),
    followUp: String(j.followUp ?? '').trim(),
  }
}

const MARK: Record<PointStatus, string> = { covered: '✓', partial: '◐', missing: '✗' }

// Plain-text form (Telegram drill reply, telegram_drills.critique).
export function scorecardText(c: Scorecard): string {
  const k = CRITERIA[c.rubric]
  const covered = c.points.filter(p => p.status === 'covered').length
  return [
    `${c.verdict} — ${c.summary}`,
    `Key points ${covered}/${c.points.length} · ${k.correctness} ${c.correctness}/2 · ${k.depth} ${c.depth}/2 · ${k.clarity} ${c.clarity}/1`,
    c.points.map(p => `${MARK[p.status]} ${p.point}${p.note ? ` — ${p.note}` : ''}`).join('\n'),
    `Fix next:\n${c.fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
    c.followUp ? `Follow-up they'd ask: ${c.followUp}` : '',
  ].filter(Boolean).join('\n\n')
}

// Uncached (every answer differs). `note` adds rubric context (e.g. "this
// answer was spoken"). A reply that isn't a valid scorecard (budget
// fallback, malformed JSON) comes back as plain feedback with no rating.
export async function critiqueQuestion(db: SupabaseClient, userId: string, questionId: string, answer: string, note = ''): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const { data: q } = await db.from('coding_questions').select('title, answer_hints, category, body').eq('id', questionId).single()
  if (!q) throw new Error('Question not found')
  const rubric = rubricFor(q.category)
  // Linked system-design rows carry only a full-stack extension: derive the
  // frontend points, then grade that one too.
  const hints = !q.answer_hints ? '\nKey points: (none listed — derive them)'
    : q.answer_hints.startsWith('Full-stack extension') ? `\nKey points: derive the 4–5 frontend points a strong answer must hit, then add this one as the last point — ${q.answer_hints}`
    : `\nKey points: ${q.answer_hints}`
  const body = q.body ? `\n\nCode under review:\n${q.body}` : ''
  const prompt = `Interview question: ${q.title}${hints}${body}${note ? `\n\n${note}` : ''}\n\nCandidate's answer:\n${answer}`
  return grade(rubric === 'ai-native' ? 'ai_native_critique' : 'answer_critique', rubric, prompt, userId)
}

export const rubricFor = (category: string): Rubric =>
  category === 'ai-native' ? 'ai-native' : category === 'behavioral' ? 'behavioral' : category === 'code-review' ? 'code-review' : category === 'ai-assisted' ? 'ai-assisted' : 'technical'

// Story Bank rehearsal: a STAR answer to a competency prompt, graded against
// fixed STAR key points plus the competency's own signal.
export async function critiqueStory(userId: string, competency: string, question: string, answer: string, note = ''): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const points = ['clear situation and stakes', 'your task or role', 'specific actions you took (I, not we)', 'a measurable result', `shows ${competency.toLowerCase()}`, 'reflection or what you would do differently']
  const prompt = `Competency being assessed: ${competency}\nInterview question: ${question}\nKey points: ${points.join(' · ')}${note ? `\n\n${note}` : ''}\n\nCandidate's answer:\n${answer}`
  return grade('story_critique', 'story', prompt, userId)
}

async function grade(task: 'answer_critique' | 'ai_native_critique' | 'story_critique', rubric: Rubric, prompt: string, userId: string): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const raw = await askAI(task, prompt, SYSTEMS[rubric], { userId })
  const card = parseScorecard(raw, rubric)
  if (!card) return { rating: null, feedback: raw.trim().startsWith('{') ? 'The review came back malformed — try again.' : raw, card: null }
  const rating = scoreCard(card)
  card.verdict = rating >= 8 ? 'Strong' : rating >= 6 ? 'Good' : 'Needs work'
  return { rating, feedback: scorecardText(card), card }
}

// A follow-up question from a review, answered by the user: graded with the
// same scorecard (key points derived — a follow-up has none listed). Story
// follow-ups use the behavioral rubric; STAR points don't fit a follow-up.
export async function critiqueFollowUp(userId: string, rubric: Rubric, original: string, followUp: string, answer: string, note = ''): Promise<{ rating: number | null; feedback: string; card: Scorecard | null }> {
  const r: Rubric = rubric === 'story' ? 'behavioral' : rubric
  const prompt = `Original interview question: ${original}\nFollow-up question (grade the answer to this): ${followUp}\nKey points: (none listed — derive them)${note ? `\n\n${note}` : ''}\n\nCandidate's answer:\n${answer}`
  return grade(r === 'ai-native' ? 'ai_native_critique' : 'answer_critique', r, prompt, userId)
}

const MODEL_ANSWER_SYSTEM = `You are a senior frontend engineer showing a candidate what a strong spoken interview answer sounds like for a Senior Frontend Engineer role.
Write the answer itself, in first person, as it would be said out loud: 150–220 words, plain text, no headings, no markdown except backticks around code identifiers and an optional short code snippet (≤6 lines) on its own lines.
Shape by question type — theory/Angular/React: what it is → how it works under the hood → a concrete example → a trade-off or pitfall. System design: requirements → architecture → state and data flow → performance/accessibility → trade-offs, in compact sentences. Behavioral or AI-native: a believable STAR-style example with a specific result; it is an example to adapt, so keep details generic enough to swap in the candidate's own.
Cover every listed key point. Be technically precise and current as of React 19 / Next.js 15 / Angular 19: show only today's recommended approach (never present a legacy pattern, then correct it), treat stable features as stable, and name versions where relevant. Put any code in a fenced block (three backticks). No preamble.`

// The Question Bank "Answer" button: a model answer per question. Same
// prompt every time for a question, so the gateway caches it (model_answer,
// one year) and only the first reveal costs anything.
export async function modelAnswer(db: SupabaseClient, userId: string, questionId: string): Promise<string> {
  const { data: q } = await db.from('coding_questions').select('title, answer_hints, category, body').eq('id', questionId).single()
  if (!q) throw new Error('Question not found')
  const prompt = `Category: ${q.category}\nInterview question: ${q.title}${q.answer_hints ? `\nKey points to cover: ${q.answer_hints}` : ''}${q.body ? `\n\nCode under review:\n${q.body}\n\nWrite the review a strong senior would give: issues ranked by severity, each with why it matters and the fix.` : ''}`
  return (await askAI('model_answer', prompt, MODEL_ANSWER_SYSTEM, { userId })).trim()
}

// Rubric note for an answer dictated via Speak / a voice note.
export const SPOKEN_NOTE = (seconds: number, fillers: number) =>
  `This answer was spoken and transcribed (~${seconds}s, ${fillers} filler words). Ignore transcription errors and misheard words (e.g. "edit 4" for "@for"); judge it as a spoken answer, and put delivery (length, structure, fillers) in fixes only if it hurt the answer.`
