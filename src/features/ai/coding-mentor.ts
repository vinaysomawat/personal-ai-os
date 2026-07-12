'use server'

import { askAI } from '@/lib/ai-gateway'

interface CodingContext {
  recentSolved: string[]
  currentStreakDays: number
  recentReading: string[]
}

export async function askCodingMentor(question: string, ctx: CodingContext): Promise<string> {
  const context = `Vinay's coding practice snapshot:
- Current daily-question streak: ${ctx.currentStreakDays} day(s)
- Recently solved: ${ctx.recentSolved.length ? ctx.recentSolved.join(', ') : 'none yet'}
- Recently read: ${ctx.recentReading.length ? ctx.recentReading.join(', ') : 'none yet'}

Question: ${question}`

  return askAI('coding_mentor', context, `You are Vinay's coding mentor. He's a frontend/testing engineer targeting senior+ roles (JS/TS/React/Next.js, system design, AI-assisted dev).
Give sharp, concrete answers — explain concepts with a short example when useful, or point out the pattern behind a problem rather than just the answer.
Under 200 words. No generic platitudes.`)
}
