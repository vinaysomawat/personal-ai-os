'use server'

import { askAI } from '@/lib/ai-gateway'
import { buildContextSummary, buildBrainPrompt, BRAIN_SYSTEM_PROMPT, type BrainMessage } from './prompts'
import type { BrainContext } from './types'

// Ask Brain — the only Brain view (Decide / Reflect / Monthly removed
// 2026-10-10). Free-form Q&A over the dashboard's already-built context.
export async function askBrain(question: string, context: BrainContext, history: BrainMessage[] = []): Promise<string> {
  if (!question.trim()) return "Ask me something about your day, your goals, or a decision you're weighing."

  const contextSummary = buildContextSummary(context)
  const prompt = buildBrainPrompt(contextSummary, history, question)

  return askAI('brain_qa', prompt, BRAIN_SYSTEM_PROMPT)
}
