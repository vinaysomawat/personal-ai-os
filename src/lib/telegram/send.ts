import type { InlineButton, QuizPollParams, SentPollMessage } from './types'

// Escapes text for parse_mode HTML (only <, > and & are special there).
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// HTML mode is needed for <tg-spoiler>; legacy Markdown (sendMessage) has no
// spoiler syntax. Escape any untrusted text with escapeHtml() first.
export async function sendHtmlMessage(token: string, chatId: number, html: string, options?: { buttons?: InlineButton[][] }): Promise<boolean> {
  const body: Record<string, unknown> = { chat_id: chatId, text: html, parse_mode: 'HTML' }
  if (options?.buttons) body.reply_markup = { inline_keyboard: options.buttons }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return !!data?.ok
}

// Sends a native quiz poll. Returns the sent message (poll.id is what a later
// poll_answer refers to), or null when Telegram rejected it (e.g. a length
// limit) — the caller decides how to recover.
export async function sendQuizPoll(token: string, params: QuizPollParams): Promise<SentPollMessage | null> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendPoll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json().catch(() => null)
  return data?.ok ? (data.result as SentPollMessage) : null
}

export async function sendMessage(token: string, chatId: number, text: string, options?: { buttons?: InlineButton[][] }) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'Markdown' }
  if (options?.buttons) body.reply_markup = { inline_keyboard: options.buttons }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function answerCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
}

export async function editMessageReplyMarkup(token: string, chatId: number, messageId: number, buttons?: InlineButton[][]) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: buttons ? { inline_keyboard: buttons } : { inline_keyboard: [] } }),
  })
}
