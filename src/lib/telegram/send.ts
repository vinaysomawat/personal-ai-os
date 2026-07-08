import type { InlineButton } from './types'

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
