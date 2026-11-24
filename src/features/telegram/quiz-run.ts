import type { SupabaseClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/telegram/send'
import { QUIZ_CATEGORIES, quizCategoryLabel, isQuizCategory, type QuizChat } from './quiz'

// Runs a built /quiz session one question at a time: send question N, wait
// for its answer (a poll_answer for an MCQ, a self-grade button for a
// descriptive), record it, send N+1, and score the quiz after the last one.
//
// Every webhook call is stateless, so the database carries the state, and
// every write that moves the quiz forward is conditional ("only if not
// answered yet" / "only if still at this position") — a double tap or a
// Telegram retry then becomes a no-op instead of skipping a question.

const POLL_QUESTION_MAX = 300

type Grade = 1 | 0.5 | 0
const GRADE_CODES: Record<string, Grade> = { g: 1, p: 0.5, m: 0 }
const GRADE_LABEL: Record<string, string> = { g: '✅ Got it', p: '🟡 Partly', m: '❌ Missed' }

interface SessionRow { id: string; user_id: string; category: string; item_ids: string[]; current_index: number; status: string }
interface ItemRow { id: string; kind: 'mcq' | 'descriptive'; stem: string; options: string[] | null; correct_index: number | null; note: string | null; short_answer: string | null }

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`)

async function loadSession(db: SupabaseClient, id: string): Promise<SessionRow | null> {
  const { data, error } = await db.from('quiz_sessions').select('id, user_id, category, item_ids, current_index, status').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as SessionRow | null
}

// Sends the question at `position`. Idempotent: the (session_id, position)
// unique key means a second call for the same position does nothing.
export async function sendQuestion(db: SupabaseClient, chat: QuizChat, session: SessionRow, position: number): Promise<void> {
  const itemId = session.item_ids[position]
  const { data: item, error: itErr } = await db.from('quiz_items')
    .select('id, kind, stem, options, correct_index, note, short_answer').eq('id', itemId).single()
  if (itErr || !item) throw new Error(itErr?.message ?? 'Quiz item missing')
  const it = item as ItemRow

  const { data: answer, error: insErr } = await db.from('quiz_answers')
    .insert({ user_id: session.user_id, session_id: session.id, item_id: it.id, position }).select('id').single()
  if (insErr?.code === '23505') return // already sent
  if (insErr || !answer) throw new Error(insErr?.message ?? 'Could not record question')

  const n = `${position + 1}/${session.item_ids.length}`
  if (it.kind === 'mcq' && it.options && it.correct_index !== null) {
    const sent = await chat.sendPoll({
      question: clip(`Q${n} · ${it.stem}`, POLL_QUESTION_MAX),
      options: it.options,
      correctIndex: it.correct_index,
      explanation: it.note ?? undefined,
    })
    if (sent) {
      const { error } = await db.from('quiz_answers').update({ poll_id: sent.pollId, message_id: sent.messageId }).eq('id', answer.id)
      if (error) throw new Error(error.message)
      return
    }
    // Telegram rejected the poll: skip it (not scored) rather than stall.
    await db.from('quiz_answers').update({ answered_at: new Date().toISOString() }).eq('id', answer.id)
    await chat.send(`⚠️ Q${n} couldn't be sent — skipped.`)
    return advance(db, chat, session.id, position)
  }

  const html = `✍️ <b>Q${n} · Descriptive</b>\n\n${escapeHtml(it.stem)}\n\n`
    + `Answer it out loud or in your head, then tap to reveal the key points:\n\n`
    + `<tg-spoiler>${escapeHtml(it.short_answer ?? '')}</tg-spoiler>\n\nHow did you do?`
  const ok = await chat.sendHtml(html, [[
    { text: GRADE_LABEL.g, callback_data: `quiz:g:${answer.id}:g` },
    { text: GRADE_LABEL.p, callback_data: `quiz:g:${answer.id}:p` },
    { text: GRADE_LABEL.m, callback_data: `quiz:g:${answer.id}:m` },
  ]])
  if (!ok) {
    await db.from('quiz_answers').update({ answered_at: new Date().toISOString() }).eq('id', answer.id)
    await chat.send(`⚠️ Q${n} couldn't be sent — skipped.`)
    return advance(db, chat, session.id, position)
  }
}

export async function startQuiz(db: SupabaseClient, chat: QuizChat, sessionId: string): Promise<void> {
  const session = await loadSession(db, sessionId)
  if (!session || session.status !== 'active') return
  await sendQuestion(db, chat, session, 0)
}

// Moves from `position` to the next question, or finishes. The update only
// matches while current_index is still `position`, so two racing answers to
// the same question can't advance twice.
async function advance(db: SupabaseClient, chat: QuizChat, sessionId: string, position: number): Promise<void> {
  const { data: moved, error } = await db.from('quiz_sessions')
    .update({ current_index: position + 1 })
    .eq('id', sessionId).eq('status', 'active').eq('current_index', position)
    .select('id, user_id, category, item_ids, current_index, status')
  if (error) throw new Error(error.message)
  const session = (moved?.[0] ?? null) as SessionRow | null
  if (!session) return
  if (session.current_index < session.item_ids.length) return sendQuestion(db, chat, session, session.current_index)
  return finishQuiz(db, chat, session)
}

// A poll_answer update: the user tapped an option on a quiz poll.
export async function handlePollAnswer(db: SupabaseClient, chat: QuizChat, userId: string, pollId: string, optionIds: number[]): Promise<void> {
  const { data: row, error } = await db.from('quiz_answers')
    .select('id, session_id, position, answered_at, quiz_items(correct_index), quiz_sessions(status)')
    .eq('poll_id', pollId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  // Not a quiz poll, already answered, or from an abandoned quiz: ignore.
  const session = row?.quiz_sessions as unknown as { status: string } | null
  if (!row || row.answered_at || session?.status !== 'active') return
  const item = row.quiz_items as unknown as { correct_index: number } | null
  const correct = optionIds.length > 0 && optionIds[0] === item?.correct_index

  // Conditional on answered_at still null: a redelivered update records nothing.
  const { data: updated, error: upErr } = await db.from('quiz_answers')
    .update({ correct, answered_at: new Date().toISOString() })
    .eq('id', row.id).is('answered_at', null).select('id')
  if (upErr) throw new Error(upErr.message)
  if (!updated?.length) return
  // No reply needed: Telegram's quiz poll already shows ✅/❌ and the note.
  await advance(db, chat, row.session_id as string, row.position as number)
}

// A self-grade button on a descriptive question: data = "quiz:g:<answerId>:<g|p|m>".
export async function handleGrade(db: SupabaseClient, chat: QuizChat & { ack(t?: string): Promise<void>; clearButtons(): Promise<void> }, userId: string, answerId: string, code: string): Promise<void> {
  const grade = GRADE_CODES[code]
  if (grade === undefined) return chat.ack()
  const { data: updated, error } = await db.from('quiz_answers')
    .update({ self_grade: grade, answered_at: new Date().toISOString() })
    .eq('id', answerId).eq('user_id', userId).is('answered_at', null)
    .select('session_id, position, quiz_sessions(status)')
  if (error) throw new Error(error.message)
  const row = updated?.[0]
  if (!row) {
    await chat.ack('Already graded')
    return chat.clearButtons()
  }
  await chat.ack(GRADE_LABEL[code])
  await chat.clearButtons()
  const status = (row.quiz_sessions as unknown as { status: string } | null)?.status
  if (status === 'active') await advance(db, chat, row.session_id as string, row.position as number)
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export async function finishQuiz(db: SupabaseClient, chat: QuizChat, session: SessionRow): Promise<void> {
  const { data: done, error } = await db.from('quiz_sessions')
    .update({ status: 'done', finished_at: new Date().toISOString() })
    .eq('id', session.id).eq('status', 'active').select('id')
  if (error) throw new Error(error.message)
  if (!done?.length) return // another call already finished it

  const { data: answers, error: aErr } = await db.from('quiz_answers')
    .select('correct, self_grade, quiz_items(kind, coding_questions(category))').eq('session_id', session.id)
  if (aErr) throw new Error(aErr.message)

  let mcqScore = 0, mcqTotal = 0, descScore = 0, descTotal = 0
  const missedBy = new Map<string, number>()
  for (const a of answers ?? []) {
    const item = a.quiz_items as unknown as { kind: string; coding_questions: { category: string } | null } | null
    const cat = item?.coding_questions?.category ?? 'other'
    if (item?.kind === 'mcq' && a.correct !== null) {
      mcqTotal++
      if (a.correct) mcqScore++
      else missedBy.set(cat, (missedBy.get(cat) ?? 0) + 1)
    } else if (item?.kind === 'descriptive' && a.self_grade !== null) {
      const g = Number(a.self_grade)
      descTotal++
      descScore += g
      if (g < 1) missedBy.set(cat, (missedBy.get(cat) ?? 0) + (1 - g))
    }
  }
  const total = mcqScore + descScore
  const outOf = mcqTotal + descTotal
  const pct = outOf > 0 ? Math.round((total / outOf) * 100) : 0
  const label = isQuizCategory(session.category) ? quizCategoryLabel(session.category) : session.category
  const catLabel = (c: string) => (c in QUIZ_CATEGORIES ? QUIZ_CATEGORIES[c as keyof typeof QUIZ_CATEGORIES] : c.charAt(0).toUpperCase() + c.slice(1))
  // Weakest first — the categories that cost the most points. Only says
  // something new in a Mixed quiz; a single-category one is all one category.
  const weak = [...missedBy].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => catLabel(c))

  const lines = [
    `🏁 *${label} quiz — ${fmt(total)}/${outOf}* (${pct}%)`,
    `Multiple choice ${fmt(mcqScore)}/${mcqTotal} · Descriptive ${fmt(descScore)}/${descTotal}`,
    ...(total === outOf && outOf > 0 ? ['🎯 Clean sweep'] : session.category === 'mixed' && weak.length ? [`Weakest: ${weak.join(', ')}`] : []),
    '',
    'Send /quiz for another.',
  ]
  await chat.send(lines.join('\n'))
}
