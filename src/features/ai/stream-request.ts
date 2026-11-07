import { z } from 'zod'
import type { BrainContext } from '@/features/brain/types'
import type { FinancialContext } from './finance-prompt'

// What the browser may ask POST /api/ai/stream for: a feature and its inputs,
// never a prompt, task or model. The server builds the prompt from these.
const question = z.string().trim().min(1).max(4000)
const object = <T>() => z.custom<T>(v => typeof v === 'object' && v !== null)

export const aiStreamRequest = z.discriminatedUnion('feature', [
  z.object({
    feature: z.literal('brain'),
    question,
    context: object<BrainContext>(),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).max(50),
  }),
  z.object({ feature: z.literal('finance'), question, context: object<FinancialContext>() }),
  z.object({ feature: z.literal('model_answer'), questionId: z.uuid() }),
  // The daily reading is JSON, so only these two periods stream.
  z.object({ feature: z.literal('astrology'), period: z.enum(['monthly', 'yearly']), lang: z.enum(['en', 'hi']) }),
])

export type AIStreamRequest = z.infer<typeof aiStreamRequest>
