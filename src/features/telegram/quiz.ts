import type { SupabaseClient } from '@supabase/supabase-js'
import type { InlineButton, ModuleReply } from '@/lib/telegram/types'

// Telegram /quiz (Daily bot): 8 questions per quiz — 6 MCQ as native quiz
// polls + 2 descriptive with a spoiler answer and self-grade buttons. Scoring
// stays in quiz_sessions / quiz_answers and never touches question_progress.

export const MCQ_COUNT = 6
export const DESCRIPTIVE_COUNT = 2

// Bank categories offered in the picker — the ones that make sensible MCQs.
// Coding categories (algorithm, ui-coding, javascript-functions, code-review)
// can't be answered by tapping an option, and behavioral/resume have no
// single right option, so they only ever fill descriptive slots.
export const QUIZ_CATEGORIES = {
  'quiz': 'JS & React',
  'system-design': 'System design',
  'architecture': 'FE architecture',
  'backend': 'Backend & APIs',
  'ai-engineering': 'AI engineering',
  'ai-native': 'AI-native',
  'angular': 'Angular',
} as const
export type QuizCategory = keyof typeof QUIZ_CATEGORIES | 'mixed'

export const DESCRIPTIVE_ONLY = ['behavioral', 'resume'] as const

export function isQuizCategory(c: string): c is QuizCategory {
  return c === 'mixed' || c in QUIZ_CATEGORIES
}

export function quizCategoryLabel(c: QuizCategory): string {
  return c === 'mixed' ? 'Mixed' : QUIZ_CATEGORIES[c]
}

// "/quiz", or "/quiz@BotName" when picked from the "/" menu in a group.
export function isQuizCommand(text: string): boolean {
  return /^\/quiz(@\w+)?$/i.test(text.trim())
}

// callback_data (≤64 bytes): "quiz:cat:<category>" (longest 23) and
// "quiz:g:<answer uuid>:<g|p|m>" (45).
export const QUIZ_CALLBACK_PREFIX = 'quiz:'

function categoryKeyboard(): InlineButton[][] {
  const buttons: InlineButton[] = [
    ...(Object.keys(QUIZ_CATEGORIES) as (keyof typeof QUIZ_CATEGORIES)[]).map(c => ({
      text: QUIZ_CATEGORIES[c], callback_data: `quiz:cat:${c}`,
    })),
    { text: '🎲 Mixed', callback_data: 'quiz:cat:mixed' },
  ]
  // Two per row: readable on a phone without truncating labels.
  const rows: InlineButton[][] = []
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2))
  return rows
}

export function quizPicker(): ModuleReply {
  return {
    text: `🧠 *Quiz* — ${MCQ_COUNT} multiple choice + ${DESCRIPTIVE_COUNT} descriptive.\nPick a category:`,
    buttons: categoryKeyboard(),
  }
}

// Sending to the quiz's chat, injected by the handler so the quiz code
// never touches bot tokens and tests can pass a fake.
export interface QuizChat {
  // Legacy Markdown — only for text the quiz code wrote itself.
  send(reply: ModuleReply): Promise<void>
  // HTML mode (for <tg-spoiler>); returns false if Telegram rejected it.
  sendHtml(html: string, buttons?: InlineButton[][]): Promise<boolean>
  // Native quiz poll; null if Telegram rejected it.
  sendPoll(p: { question: string; options: string[]; correctIndex: number; explanation?: string }): Promise<{ pollId: string; messageId: number } | null>
}

// A button tap adds callback-query side effects. The quiz code decides the
// order — a tap must be acknowledged before a slow AI call, or the button
// keeps spinning.
export interface ButtonIO extends QuizChat {
  // Answer the callback query (stops the spinner; optional toast). Only the
  // first call counts.
  ack(toast?: string): Promise<void>
  // Remove the inline keyboard from the tapped message (stops double taps).
  clearButtons(): Promise<void>
}

// Routes a "quiz:..." button tap:
//   quiz:cat:<category>          → build a quiz and send question 1
//   quiz:g:<answerId>:<g|p|m>    → self-grade a descriptive question
export async function handleQuizCallback(data: string, db: SupabaseClient, userId: string, io: ButtonIO): Promise<void> {
  const [, kind, value, extra] = data.split(':')
  if (kind === 'cat') {
    if (!value || !isQuizCategory(value)) return io.ack('Unknown category')
    await io.ack(quizCategoryLabel(value))
    await io.clearButtons()
    await io.send(`⏳ Building a *${quizCategoryLabel(value)}* quiz…`)
    const { buildQuizSession } = await import('./quiz-build')
    const built = await buildQuizSession(db, userId, value)
    if (!built.ok) return io.send(built.message)
    await io.send(`✅ ${built.mcq} multiple choice + ${built.descriptive} descriptive. Go!`)
    const { startQuiz } = await import('./quiz-run')
    return startQuiz(db, io, built.sessionId)
  }
  if (kind === 'g' && value && extra) {
    const { handleGrade } = await import('./quiz-run')
    return handleGrade(db, io, userId, value, extra)
  }
  return io.ack()
}
