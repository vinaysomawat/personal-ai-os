import type { BrainContext } from './types'

export const BRAIN_SYSTEM_PROMPT = `You are Vinay's personal Brain — a single assistant that understands his whole life across Career, Finance, Health, Coding and interview prep, and helps him make decisions.

Rules:
- Answer directly and specifically using only the context provided below. Never invent numbers, events, or facts that aren't in the context.
- If the context doesn't have what you need to answer well, say so plainly instead of guessing.
- Be concrete, not generic — reference actual numbers/items from the context rather than general advice.
- Keep the response under 200 words.
- Plain conversational sentences only — no markdown (no #/##  headings, no **bold**, no bullet lists). Write it like you're talking to him, not writing a report.`

// Turns the Context Builder's output into a compact, readable block for the
// prompt — one line per module, not the raw object (Core Principle 2: the
// Brain consumes summarized context, never raw rows).
export function buildContextSummary(ctx: BrainContext): string {
  const lines = [
    `Today: ${ctx.today}`,
    `Life Score: ${ctx.lifeScore}/100`,
    `Career: ${ctx.career.activeApplications} active applications${ctx.career.currentRole ? `, currently ${ctx.career.currentRole}${ctx.career.currentCompany ? ` at ${ctx.career.currentCompany}` : ''}` : ''}${ctx.career.targetRole ? `, targeting ${ctx.career.targetRole}` : ''}${ctx.career.currentSalary ? `, current salary ₹${Math.round(ctx.career.currentSalary).toLocaleString('en-IN')}` : ''}${ctx.career.bio ? `. Bio/focus: ${ctx.career.bio}` : ''}`,
    `Finance: ₹${Math.round(ctx.finance.monthSpend)} spent of ₹${Math.round(ctx.finance.monthBudget)} budget this month`,
    `Health: ${ctx.health.workoutsToday} workout(s) today${ctx.health.todayMetric ? '' : ', no metrics logged today'}`,
    `Practice: ${ctx.practice.questions30d} interview questions practiced in the last 30 days`,
  ]

  if (ctx.finance.goals.length > 0) {
    lines.push('Financial goals: ' + ctx.finance.goals.map(g => `${g.name} (₹${Math.round(g.currentAmount).toLocaleString('en-IN')} of ₹${Math.round(g.targetAmount).toLocaleString('en-IN')}${g.targetDate ? `, by ${g.targetDate}` : ''})`).join('; '))
  }
  if (ctx.signals.length > 0) {
    lines.push('Top open items: ' + ctx.signals.map(s => `${s.emoji} ${s.text}`).join('; '))
  }

  return lines.join('\n')
}

export interface BrainMessage {
  role: 'user' | 'assistant'
  content: string
}

export function buildBrainPrompt(contextSummary: string, history: BrainMessage[], question: string): string {
  const historyBlock = history.length > 0
    ? '\n\nPrevious conversation (most recent last):\n' + history.map(m => `${m.role === 'user' ? 'Vinay' : 'Brain'}: ${m.content}`).join('\n')
    : ''

  return `Context:\n${contextSummary}${historyBlock}\n\nVinay's question: ${question}`
}
