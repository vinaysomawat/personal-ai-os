import { z } from 'zod'
import type { BrainContext } from '@/features/brain/types'
import type { FinancialContext } from './finance-prompt'

// What the browser may ask POST /api/ai/stream for: a feature and its inputs,
// never a prompt, task or model. The server builds the prompt from these.
const question = z.string().trim().min(1).max(4000)
const answer = z.string().trim().min(1).max(20000)
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
  // Reviews answer with ReviewEvent lines, not plain text.
  z.object({ feature: z.literal('review_answer'), questionId: z.uuid(), answer, spoken: z.boolean() }),
  z.object({
    feature: z.literal('review_followup'),
    rubric: z.enum(['technical', 'behavioral', 'ai-native', 'story', 'code-review']),
    original: question, followUp: question, answer, spoken: z.boolean(),
  }),
  z.object({
    feature: z.literal('review_story'),
    competency: z.string().min(1).max(100), prompt: question, answer, storyId: z.uuid().nullable(), spoken: z.boolean(),
  }),
])

export type AIStreamRequest = z.infer<typeof aiStreamRequest>
