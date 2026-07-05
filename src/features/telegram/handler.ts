import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/telegram/send'
import { aiText } from '@/lib/anthropic'
import { transcribeVoice } from '@/lib/telegram/transcribe'
import type { TelegramUpdate } from '@/lib/telegram/types'

import * as planner   from './modules/planner'
import * as career    from './modules/career'
import * as finance   from './modules/finance'
import * as health    from './modules/health'
import * as learning  from './modules/learning'
import * as coding    from './modules/coding'
import * as documents from './modules/documents'

const MODULES = { planner, career, finance, health, learning, coding, documents } as const
type ModuleName = keyof typeof MODULES

export const MODULE_TOKENS: Record<ModuleName, string | undefined> = {
  planner:   process.env.TELEGRAM_BOT_TOKEN_PLANNER,
  career:    process.env.TELEGRAM_BOT_TOKEN_CAREER,
  finance:   process.env.TELEGRAM_BOT_TOKEN_FINANCE,
  health:    process.env.TELEGRAM_BOT_TOKEN_HEALTH,
  learning:  process.env.TELEGRAM_BOT_TOKEN_LEARNING,
  coding:    process.env.TELEGRAM_BOT_TOKEN_CODING,
  documents: process.env.TELEGRAM_BOT_TOKEN_DOCUMENTS,
}

export function isValidModule(m: string): m is ModuleName {
  return m in MODULES
}

export async function handleUpdate(moduleName: ModuleName, update: TelegramUpdate): Promise<void> {
  const msg = update.message
  if (!msg?.text && !msg?.voice) return

  const chatId = msg.chat.id
  const allowedId = process.env.TELEGRAM_ALLOWED_CHAT_ID
  if (allowedId && String(chatId) !== allowedId) return

  const token = MODULE_TOKENS[moduleName]
  if (!token) return

  const userId = process.env.SUPABASE_USER_ID
  if (!userId) {
    await sendMessage(token, chatId, '❌ SUPABASE_USER_ID not configured.')
    return
  }

  const mod = MODULES[moduleName]

  // Transcribe voice to text if needed
  let text: string
  if (msg.voice) {
    try {
      await sendMessage(token, chatId, '🎙️ Transcribing...')
      text = await transcribeVoice(token, msg.voice.file_id)
      if (!text) {
        await sendMessage(token, chatId, '❌ Could not understand the voice message.')
        return
      }
    } catch {
      await sendMessage(token, chatId, '❌ Voice transcription failed. Please check GROQ_API_KEY.')
      return
    }
  } else {
    text = msg.text!.trim()
  }

  let action: Record<string, unknown> = { action: 'help' }
  let reply = ''

  try {
    const raw = await aiText(text, mod.SYSTEM_PROMPT)
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) action = JSON.parse(match[0])
  } catch {
    action = { action: 'help' }
  }

  try {
    const db = createServiceClient()
    reply = await mod.execute(action, db, userId)
  } catch (err) {
    reply = `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`
  }

  await sendMessage(token, chatId, reply)

  // Log every instruction
  try {
    const db = createServiceClient()
    await db.from('telegram_logs').insert({
      module: moduleName,
      telegram_chat_id: chatId,
      message: text,
      action_taken: action,
      response: reply,
    })
  } catch {
    // Non-fatal: log failure shouldn't affect user
  }
}
