import type { SupabaseClient } from '@supabase/supabase-js'
import { askAIWithMeta } from '@/lib/ai-gateway'
import { DESCRIPTIVE_COUNT, DESCRIPTIVE_ONLY, MCQ_COUNT, QUIZ_CATEGORIES, type QuizCategory } from './quiz'

// Builds one /quiz session: picks 8 bank questions, makes sure each has a
// stored quiz version (generating the missing ones with one AI call), and
// inserts the quiz_sessions row. Reads the bank, never writes Prep progress.

export type ItemKind = 'mcq' | 'descriptive'

interface PoolQuestion { id: string; title: string; category: string; answer_hints: string | null }
export interface Slot { question: PoolQuestion; kind: ItemKind }

// Don't repeat a question quizzed in the last 3 days.
const RECENT_MS = 3 * 86400_000
// A re-tap / Telegram retry within this window reuses the building quiz.
const BUILD_GUARD_MS = 90_000
const SHORT_ANSWER_MAX = 700

const ALL_QUIZ = Object.keys(QUIZ_CATEGORIES) as (keyof typeof QUIZ_CATEGORIES)[]

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Which bank category each of the 8 slots draws from.
//  single category → 6 MCQ + 2 descriptive, all from it
//  mixed → 6 MCQ from 6 different categories, 1 descriptive behavioral/resume
//          + 1 descriptive from any quiz category
export function slotPlan(category: QuizCategory): { kind: ItemKind; from: string[] }[] {
  if (category !== 'mixed') {
    return [
      ...Array.from({ length: MCQ_COUNT }, () => ({ kind: 'mcq' as const, from: [category] })),
      ...Array.from({ length: DESCRIPTIVE_COUNT }, () => ({ kind: 'descriptive' as const, from: [category] })),
    ]
  }
  return [
    ...shuffle(ALL_QUIZ).slice(0, MCQ_COUNT).map(c => ({ kind: 'mcq' as const, from: [c] })),
    { kind: 'descriptive', from: [...DESCRIPTIVE_ONLY] },
    { kind: 'descriptive', from: ALL_QUIZ },
  ]
}

export interface QuizHistory {
  // question ids quizzed within RECENT_MS
  recent: Set<string>
  // question ids whose latest quiz answer was wrong / not "Got it"
  missed: Set<string>
}

// Missed-before first (older than RECENT_MS), then random. Never the same
// question twice in one quiz.
export function pickSlots(plan: ReturnType<typeof slotPlan>, pool: PoolQuestion[], history: QuizHistory): Slot[] {
  const used = new Set<string>()
  const slots: Slot[] = []
  for (const s of plan) {
    const candidates = shuffle(pool.filter(q => s.from.includes(q.category) && !used.has(q.id) && !history.recent.has(q.id)))
    const q = candidates.find(c => history.missed.has(c.id)) ?? candidates[0]
    if (!q) continue
    used.add(q.id)
    slots.push({ question: q, kind: s.kind })
  }
  return slots
}

async function loadPool(db: SupabaseClient, categories: string[]): Promise<PoolQuestion[]> {
  // One query per category: the whole eligible pool is ~1,030 rows, over
  // PostgREST's 1,000-row default page.
  const results = await Promise.all(categories.map(c =>
    db.from('coding_questions').select('id, title, category, answer_hints').eq('category', c)))
  const err = results.find(r => r.error)?.error
  if (err) throw new Error(err.message)
  return results.flatMap(r => (r.data ?? []) as PoolQuestion[])
}

async function loadHistory(db: SupabaseClient, userId: string): Promise<QuizHistory> {
  const { data, error } = await db.from('quiz_answers')
    .select('answered_at, created_at, correct, self_grade, quiz_items(question_id)')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(300)
  if (error) throw new Error(error.message)
  const recent = new Set<string>()
  const latest = new Map<string, boolean>()
  const cutoff = Date.now() - RECENT_MS
  for (const r of data ?? []) {
    const item = r.quiz_items as unknown as { question_id: string } | null
    if (!item) continue
    if (new Date(r.created_at as string).getTime() > cutoff) recent.add(item.question_id)
    // Rows are newest first, so the first answered row per question is its latest.
    if (r.answered_at && !latest.has(item.question_id)) {
      latest.set(item.question_id, r.correct === false || (r.self_grade !== null && Number(r.self_grade) < 1))
    }
  }
  return { recent, missed: new Set([...latest].filter(([, m]) => m).map(([q]) => q)) }
}

// One system prompt per kind: a single mixed batch let the model drop the
// descriptive items (seen live — 6 of 8 came back). Each call asks for one
// shape and an exact count.
const QUIZ_SYSTEM_BASE = `You turn interview-prep questions into quiz items for a senior frontend / AI product engineer. Return ONLY a JSON array with exactly one object per input item (same count, same order, "i" = the input's index). Plain text only inside strings: no markdown, no HTML, no code fences.`

export const QUIZ_SYSTEM: Record<ItemKind, string> = {
  mcq: `${QUIZ_SYSTEM_BASE}

Each object: {"i":<input index>,"stem":"<multiple-choice question, ≤280 chars>","options":["<exactly 4 options, each ≤90 chars>"],"correct":<0-3, index of the single correct option>,"note":"<why it's right, ≤180 chars>"}
- Test one concrete, unambiguous fact or judgement from the question's topic — not "which is best" opinions.
- Distractors must be plausible to a mid-level engineer and clearly wrong to a senior one. No "all of the above" / "none of the above".
- Keep options similar in length and style so the answer isn't guessable from form.`,
  descriptive: `${QUIZ_SYSTEM_BASE}

Each object: {"i":<input index>,"stem":"<the question, reworded only if needed, ≤280 chars>","short_answer":"<the key points a strong answer covers, as 3-6 short bullet lines starting with •, ≤600 chars total>"}`,
}

interface Generated {
  i: number; stem?: string; options?: unknown; correct?: unknown; note?: string; short_answer?: string
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`)

export interface QuizItemRow {
  question_id: string; kind: ItemKind; stem: string
  options: string[] | null; correct_index: number | null; note: string | null; short_answer: string | null
}

// Validates the AI's JSON against the slots it was asked for and Telegram's
// limits, and shuffles MCQ options in code (models put the answer first far
// too often). Anything malformed is dropped, not repaired.
export function parseGenerated(raw: string, asked: Slot[]): QuizItemRow[] {
  let arr: unknown
  try { arr = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)) } catch { return [] }
  if (!Array.isArray(arr)) return []
  const rows: QuizItemRow[] = []
  for (const g of arr as Generated[]) {
    const slot = Number.isInteger(g?.i) ? asked[g.i] : undefined
    const stem = typeof g?.stem === 'string' ? g.stem.trim() : ''
    if (!slot || !stem || rows.some(r => r.question_id === slot.question.id && r.kind === slot.kind)) continue
    if (slot.kind === 'mcq') {
      const opts = Array.isArray(g.options) ? g.options.map(o => String(o).trim()) : []
      const correct = Number(g.correct)
      if (opts.length !== 4 || opts.some(o => !o || o.length > 100) || new Set(opts).size !== 4) continue
      if (!Number.isInteger(correct) || correct < 0 || correct > 3) continue
      const order = shuffle([0, 1, 2, 3])
      rows.push({
        question_id: slot.question.id, kind: 'mcq', stem: clip(stem, 300),
        options: order.map(k => opts[k]), correct_index: order.indexOf(correct),
        note: typeof g.note === 'string' && g.note.trim() ? clip(g.note.trim(), 200) : null,
        short_answer: null,
      })
    } else {
      const ans = typeof g.short_answer === 'string' ? g.short_answer.trim() : ''
      if (!ans) continue
      rows.push({
        question_id: slot.question.id, kind: 'descriptive', stem: clip(stem, 300),
        options: null, correct_index: null, note: null, short_answer: clip(ans, SHORT_ANSWER_MAX),
      })
    }
  }
  return rows
}

function generationPrompt(slots: Slot[]): string {
  return JSON.stringify(slots.map((s, i) => ({
    i, category: s.question.category, question: s.question.title,
    ...(s.question.answer_hints ? { expected_areas: s.question.answer_hints } : {}),
  })))
}

export type BuildResult =
  | { ok: true; sessionId: string; itemIds: string[]; mcq: number; descriptive: number }
  | { ok: false; message: string }

export async function buildQuizSession(db: SupabaseClient, userId: string, category: QuizCategory): Promise<BuildResult> {
  // Retry / double-tap guard: an active quiz started moments ago is the one
  // being built, so don't start another. An older one is abandoned.
  const { data: active } = await db.from('quiz_sessions').select('id, started_at')
    .eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (active && Date.now() - new Date(active.started_at).getTime() < BUILD_GUARD_MS) {
    return { ok: false, message: '⏳ Your quiz is already on its way.' }
  }
  if (active) {
    await db.from('quiz_sessions').update({ status: 'abandoned', finished_at: new Date().toISOString() }).eq('id', active.id)
  }

  const plan = slotPlan(category)
  const categories = [...new Set(plan.flatMap(p => p.from))]
  const [pool, history] = await Promise.all([loadPool(db, categories), loadHistory(db, userId)])
  const slots = pickSlots(plan, pool, history)
  if (slots.length === 0) return { ok: false, message: 'No questions left to quiz right now — try another category.' }

  // Reuse stored quiz versions; generate only the missing ones.
  const { data: existing, error: exErr } = await db.from('quiz_items').select('id, question_id, kind')
    .in('question_id', slots.map(s => s.question.id))
  if (exErr) throw new Error(exErr.message)
  const have = (s: Slot) => existing?.some(e => e.question_id === s.question.id && e.kind === s.kind)
  const missing = slots.filter(s => !have(s))

  let budgetHit = false
  // One call per kind, in parallel — same total tokens, no extra wait.
  const batches = (['mcq', 'descriptive'] as const)
    .map(kind => missing.filter(s => s.kind === kind))
    .filter(b => b.length > 0)
  if (batches.length > 0) {
    const results = await Promise.all(batches.map(b =>
      askAIWithMeta('quiz_generate', generationPrompt(b), QUIZ_SYSTEM[b[0].kind], { userId })))
    budgetHit = results.some(r => r.budgetExhausted)
    const rows = results.flatMap((r, k) => parseGenerated(r.text, batches[k]))
    if (rows.length > 0) {
      // ignoreDuplicates: a concurrent build may have stored the same item.
      const { error } = await db.from('quiz_items').upsert(rows, { onConflict: 'question_id,kind', ignoreDuplicates: true })
      if (error) throw new Error(error.message)
    }
  }

  const { data: items, error: itErr } = await db.from('quiz_items').select('id, question_id, kind')
    .in('question_id', slots.map(s => s.question.id))
  if (itErr) throw new Error(itErr.message)
  // Keep slot order (MCQs first, descriptive last); drop slots that failed to generate.
  const ordered = slots
    .map(s => items?.find(it => it.question_id === s.question.id && it.kind === s.kind))
    .filter((it): it is { id: string; question_id: string; kind: ItemKind } => !!it)
  if (ordered.length === 0) {
    return { ok: false, message: budgetHit ? '⏸️ AI budget for today is used up — quizzes need it to build new questions. Try tomorrow.' : '❌ Couldn\'t build the quiz — try again.' }
  }

  const { data: session, error: sErr } = await db.from('quiz_sessions')
    .insert({ user_id: userId, category, item_ids: ordered.map(o => o.id) }).select('id').single()
  // 23505: the one-active-per-user index — a parallel build won the race.
  if (sErr?.code === '23505') return { ok: false, message: '⏳ Your quiz is already on its way.' }
  if (sErr || !session) throw new Error(sErr?.message ?? 'Could not create quiz session')

  return {
    ok: true, sessionId: session.id, itemIds: ordered.map(o => o.id),
    mcq: ordered.filter(o => o.kind === 'mcq').length,
    descriptive: ordered.filter(o => o.kind === 'descriptive').length,
  }
}
