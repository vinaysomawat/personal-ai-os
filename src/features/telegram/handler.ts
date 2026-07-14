import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage, answerCallbackQuery, editMessageReplyMarkup } from '@/lib/telegram/send'
import { askAI } from '@/lib/ai-gateway'
import { transcribeVoice } from '@/lib/telegram/transcribe'
import { downloadTelegramFile } from '@/lib/telegram/download'
import { isUndoableTable, UNDO_LABEL } from '@/lib/telegram/buttons'
import type { TelegramUpdate, InlineButton } from '@/lib/telegram/types'
import type { ImageInput } from '@/lib/anthropic'

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

// Safety ceiling against a runaway loop or accidental spam — not a tight budget.
// Generous normal daily use is well under this; override via env if needed.
const DAILY_AI_CALL_CAP = Number(process.env.TELEGRAM_DAILY_AI_CAP ?? 300)

async function todaysCallCount(db: ReturnType<typeof createServiceClient>): Promise<number> {
  const todayStart = `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`
  const { count } = await db
    .from('telegram_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStart)
  return count ?? 0
}

// A message can describe several distinct instructions at once (especially
// voice notes — "workout 45 min, drank 2L, finished chapter 3"). The model
// returns a JSON array in that case, a single object otherwise. Detect which
// by checking whichever bracket — { or [ — appears first in the response,
// rather than just regex-matching "[...]" (which would misfire on a single
// object that merely contains an array-valued field, e.g. {"stack":["a","b"]}).
function extractActions(raw: string): Record<string, unknown>[] {
  const idx = raw.search(/[{[]/)
  if (idx === -1) return []
  const rest = raw.slice(idx)

  if (raw[idx] === '[') {
    const match = rest.match(/\[[\s\S]*\]/)
    if (!match) return []
    try {
      const parsed = JSON.parse(match[0])
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const match = rest.match(/\{[\s\S]*\}/)
  if (!match) return []
  try {
    return [JSON.parse(match[0])]
  } catch {
    return []
  }
}

// Handles inline-keyboard button presses (e.g. "✅ Mark Done" on a task).
// Bypasses AI classification entirely — the callback_data already encodes
// exactly what to do.
async function handleCallbackQuery(moduleName: ModuleName, update: TelegramUpdate): Promise<void> {
  const cq = update.callback_query!
  const chatId = cq.message?.chat.id
  const allowedId = process.env.TELEGRAM_ALLOWED_CHAT_ID
  if (!chatId || (allowedId && String(chatId) !== allowedId)) return

  const token = MODULE_TOKENS[moduleName]
  if (!token) return

  const data = cq.data ?? ''
  if (data.startsWith('task_done:')) {
    const taskId = data.slice('task_done:'.length)
    const db = createServiceClient()
    await db.from('tasks').update({ done: true }).eq('id', taskId)
    // Two-way sync with the Coding daily-question habit system, same as the web app's toggleTask
    await db.from('coding_daily_questions').update({ completed: true, completed_at: new Date().toISOString() }).eq('task_id', taskId)
    await db.from('trending_readings').update({ completed: true, completed_at: new Date().toISOString() }).eq('task_id', taskId)
    const { data: dw } = await db.from('daily_workouts').select('id').eq('task_id', taskId).in('status', ['pending', 'in_progress']).maybeSingle()
    if (dw) {
      const { markWorkoutComplete } = await import('@/features/health/workout-core')
      await markWorkoutComplete(db, dw.id)
    }
    await answerCallbackQuery(token, cq.id, '✅ Marked done!')
    if (cq.message) await editMessageReplyMarkup(token, chatId, cq.message.message_id)
  } else if (data.startsWith('undo:')) {
    const [, table, id] = data.split(':')
    if (isUndoableTable(table) && id) {
      const db = createServiceClient()
      const { data: row } = await db.from(table).select('*').eq('id', id).maybeSingle()
      await db.from(table).delete().eq('id', id)
      const label = row ? UNDO_LABEL[table](row) : null
      await answerCallbackQuery(token, cq.id, label ? `🗑️ Undone: ${label}` : '🗑️ Undone')
      if (cq.message) await editMessageReplyMarkup(token, chatId, cq.message.message_id)
    } else {
      await answerCallbackQuery(token, cq.id)
    }
  } else {
    await answerCallbackQuery(token, cq.id)
  }
}

export async function handleUpdate(moduleName: ModuleName, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(moduleName, update)
    return
  }

  const msg = update.message
  if (!msg?.text && !msg?.voice && !msg?.photo?.length) return

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
  const db = createServiceClient()

  // Transcribe voice, or download the photo, if needed
  let text: string
  let image: ImageInput | undefined
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
  } else if (msg.photo?.length) {
    const visionPrompt = (mod as { VISION_PROMPT?: string }).VISION_PROMPT
    if (!visionPrompt) {
      await sendMessage(token, chatId, "📷 This bot can't process photos yet — try the Finance bot for receipts or the Health bot for meals.")
      return
    }
    try {
      const largest = msg.photo[msg.photo.length - 1]
      image = await downloadTelegramFile(token, largest.file_id)
    } catch {
      await sendMessage(token, chatId, '❌ Could not download the photo.')
      return
    }
    text = msg.caption?.trim() || '(photo)'
  } else {
    text = msg.text!.trim()
  }

  if ((await todaysCallCount(db)) >= DAILY_AI_CALL_CAP) {
    const reply = `⏸️ Daily AI quota reached (${DAILY_AI_CALL_CAP} calls) — resets at midnight UTC. This message wasn't processed to avoid runaway spend.`
    await sendMessage(token, chatId, reply)
    try {
      await db.from('telegram_logs').insert({
        module: moduleName,
        telegram_chat_id: chatId,
        message: text,
        action_taken: { action: 'quota_exceeded' },
        response: reply,
      })
    } catch {
      // Non-fatal: log failure shouldn't affect user
    }
    return
  }

  let actions: Record<string, unknown>[] = [{ action: 'help' }]

  try {
    const todayStr = new Date().toISOString().split('T')[0]
    const dateInstruction = `\n\nToday's actual date is ${todayStr} (YYYY-MM-DD). Always use this for "today", "now", or any relative date/default date — never guess or use a date from your training data.`
    const raw = image
      ? await askAI('telegram_vision', text, `${(mod as { VISION_PROMPT?: string }).VISION_PROMPT}${dateInstruction}`, { userId, image })
      : await askAI('telegram_intent', text, `${mod.SYSTEM_PROMPT}${dateInstruction}\n\nIf the message describes multiple distinct instructions (e.g. "workout 45 min, drank 2L, finished chapter 3"), return a JSON array of action objects instead of a single object — one per instruction, each in the exact shape defined above.`, { userId })
    const parsed = extractActions(raw)
    if (parsed.length > 0) actions = parsed
  } catch {
    actions = [{ action: 'help' }]
  }

  const replyParts: string[] = []
  let replyButtons: InlineButton[][] | undefined

  for (const action of actions) {
    let reply: Awaited<ReturnType<typeof mod.execute>>
    try {
      reply = await mod.execute(action, db, userId)
    } catch (err) {
      reply = `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
    if (typeof reply === 'string') {
      replyParts.push(reply)
    } else {
      replyParts.push(reply.text)
      if (reply.buttons) replyButtons = reply.buttons
    }
  }

  const replyText = replyParts.join('\n\n')
  await sendMessage(token, chatId, replyText, { buttons: replyButtons })

  // Log every instruction
  try {
    await db.from('telegram_logs').insert({
      module: moduleName,
      telegram_chat_id: chatId,
      message: text,
      action_taken: actions.length === 1 ? actions[0] : actions,
      response: replyText,
    })
  } catch {
    // Non-fatal: log failure shouldn't affect user
  }
}
