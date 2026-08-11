import type { BrainContext, WeeklyReflectionContext, MonthlyReviewContext } from './types'

export const BRAIN_SYSTEM_PROMPT = `You are Vinay's personal Brain — a single assistant that understands his whole life across Planner, Career, Finance, Health, Learning, and Coding, and helps him make decisions.

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
    `Planner: ${ctx.planner.pendingTaskCount} pending tasks`,
    `Career: ${ctx.career.activeApplications} active applications${ctx.career.currentRole ? `, currently ${ctx.career.currentRole}${ctx.career.currentCompany ? ` at ${ctx.career.currentCompany}` : ''}` : ''}${ctx.career.targetRole ? `, targeting ${ctx.career.targetRole}` : ''}${ctx.career.currentSalary ? `, current salary ₹${Math.round(ctx.career.currentSalary).toLocaleString('en-IN')}` : ''}${ctx.career.bio ? `. Bio/focus: ${ctx.career.bio}` : ''}`,
    `Finance: ₹${Math.round(ctx.finance.monthSpend)} spent of ₹${Math.round(ctx.finance.monthBudget)} budget this month`,
    `Health: ${ctx.health.workoutsToday} workout(s) today${ctx.health.todayMetric ? '' : ', no metrics logged today'}`,
    `Learning: ${ctx.learning.inProgress} resources in progress`,
    `Coding: ${ctx.coding.solved30d} questions solved in the last 30 days`,
    `Documents: ${ctx.documents.count} saved`,
  ]

  if (ctx.finance.goals.length > 0) {
    lines.push('Financial goals: ' + ctx.finance.goals.map(g => `${g.name} (₹${Math.round(g.currentAmount).toLocaleString('en-IN')} of ₹${Math.round(g.targetAmount).toLocaleString('en-IN')}${g.targetDate ? `, by ${g.targetDate}` : ''})`).join('; '))
  }
  if (ctx.signals.length > 0) {
    lines.push('Top open items: ' + ctx.signals.map(s => `${s.emoji} ${s.text}`).join('; '))
  }
  if (ctx.weeklyPatterns.length > 0) {
    lines.push('Patterns this week: ' + ctx.weeklyPatterns.join('; '))
  }
  if (ctx.monthlyPatterns.length > 0) {
    lines.push('Patterns this month: ' + ctx.monthlyPatterns.join('; '))
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

export const BRAIN_DECISION_SYSTEM_PROMPT = `You are Vinay's personal Brain, helping him make a decision using only the context provided. Never invent numbers or facts not in the context — if something needed is missing, say so in the reasoning instead of guessing.

Respond with ONLY a JSON object, no markdown, no code fences, matching exactly this shape:
{"decision": "one direct sentence — your recommendation", "reasoning": "2-3 sentences explaining why, grounded in the actual context", "tradeoffs": ["short trade-off 1", "short trade-off 2"], "confidence": "high" | "medium" | "low", "actionItems": ["concrete next step 1", "concrete next step 2"]}

confidence should be "low" whenever the context is missing information that would materially change the answer.`

export function buildDecisionPrompt(contextSummary: string, question: string): string {
  return `Context:\n${contextSummary}\n\nDecision Vinay is weighing: ${question}`
}

export const WEEKLY_REFLECTION_SYSTEM_PROMPT = `You are Vinay's personal Brain, writing his weekly reflection from his last 7 days of Life Score data and detected patterns.

Rules:
- Write exactly ONE paragraph, under 150 words, plain prose — no markdown, no headings, no bullet lists.
- Touch on: what went well (wins), what slipped (misses), any patterns worth naming, a lesson, one specific focus for next week, and a risk area to watch — woven into natural sentences, not labeled sections.
- Use only the numbers and patterns given below. Never invent a specific event, workout, or task that isn't in the data.
- If days tracked is low (fewer than 4), say plainly that there isn't much data yet rather than fabricating a narrative around it.
- Be direct and specific — reference the actual scores and module names, not generic encouragement.`

// Same "one line per fact" style as buildContextSummary — compact input for
// the model, not the raw WeeklyReflectionContext object.
export function buildWeeklyReflectionContextSummary(ctx: WeeklyReflectionContext): string {
  const lines = [
    `Days tracked this week: ${ctx.daysTracked}/7`,
    `Average Life Score: ${ctx.avgLife}/100`,
    `Best day: ${ctx.best.date} (${ctx.best.score}/100)`,
    `Worst day: ${ctx.worst.date} (${ctx.worst.score}/100)`,
    `Module averages — Health: ${ctx.moduleAvgs.Health}, Finance: ${ctx.moduleAvgs.Finance}, Career: ${ctx.moduleAvgs.Career}, Learning: ${ctx.moduleAvgs.Learning}, Projects: ${ctx.moduleAvgs.Projects}`,
  ]
  if (ctx.patterns.length > 0) {
    lines.push('Confirmed patterns: ' + ctx.patterns.join('; '))
  } else {
    lines.push('No confirmed recurring patterns yet.')
  }
  return lines.join('\n')
}

export function buildWeeklyReflectionPrompt(contextSummary: string): string {
  return `This week's data:\n${contextSummary}\n\nWrite Vinay's weekly reflection.`
}

export const BRAIN_MONTHLY_REVIEW_SYSTEM_PROMPT = `You are Vinay's personal Brain, writing his Monthly Executive Review from his last 30 days of Life Score data, this month's spending, and detected patterns.

Rules:
- Use only the numbers and patterns given below. Never invent a specific event, application, workout, or transaction that isn't in the data.
- Each field must be 1-2 sentences, direct and specific — reference the actual scores/numbers given, not generic encouragement.
- biggestAchievement and biggestMistake must each point at one specific thing grounded in the data (e.g. a module's score, best/worst day, or the top spend category) — never something invented.
- recommendation must be one concrete, actionable next step, not "keep improving."
- If days tracked is low (fewer than 10), say so plainly in "overall" instead of fabricating a fuller picture.

Respond with ONLY a JSON object, no markdown, no code fences, matching exactly this shape:
{"career": "...", "finance": "...", "health": "...", "learning": "...", "coding": "...", "overall": "...", "biggestAchievement": "...", "biggestMistake": "...", "recommendation": "..."}`

// Same "one line per fact" style as the other Brain prompts — combines the
// 30-day MonthlyReviewContext with the Career/Finance-total/Learning/Coding
// snapshot fields already sitting in the caller's BrainContext, so this is
// the only place that re-fetches anything (topSpendCategory + patterns).
export function buildMonthlyReviewContextSummary(ctx: MonthlyReviewContext, brain: BrainContext): string {
  const lines = [
    `Days tracked this month: ${ctx.daysTracked}/30`,
    `Average Life Score: ${ctx.avgLife}/100`,
    `Best day: ${ctx.best.date} (${ctx.best.score}/100)`,
    `Worst day: ${ctx.worst.date} (${ctx.worst.score}/100)`,
    `Strongest module: ${ctx.topModule[0]} (avg ${ctx.topModule[1]})`,
    `Weakest module: ${ctx.weakModule[0]} (avg ${ctx.weakModule[1]})`,
    `Module averages — Health: ${ctx.moduleAvgs.Health}, Finance: ${ctx.moduleAvgs.Finance}, Career: ${ctx.moduleAvgs.Career}, Learning: ${ctx.moduleAvgs.Learning}, Projects: ${ctx.moduleAvgs.Projects}`,
    `Finance: ₹${Math.round(brain.finance.monthSpend)} spent of ₹${Math.round(brain.finance.monthBudget)} budget this month${ctx.topSpendCategory ? `, top category: ${ctx.topSpendCategory.name} (₹${Math.round(ctx.topSpendCategory.amount).toLocaleString('en-IN')})` : ''}`,
    `Career: ${brain.career.activeApplications} active applications`,
    `Learning: ${brain.learning.inProgress} resources in progress`,
    `Coding: ${brain.coding.solved30d} questions solved in the last 30 days`,
  ]
  if (brain.finance.goals.length > 0) {
    lines.push('Financial goals: ' + brain.finance.goals.map(g => `${g.name} (₹${Math.round(g.currentAmount).toLocaleString('en-IN')} of ₹${Math.round(g.targetAmount).toLocaleString('en-IN')}${g.targetDate ? `, by ${g.targetDate}` : ''})`).join('; '))
  }
  if (ctx.patterns.length > 0) {
    lines.push('Confirmed patterns: ' + ctx.patterns.join('; '))
  } else {
    lines.push('No confirmed recurring patterns yet.')
  }
  return lines.join('\n')
}

export function buildMonthlyReviewPrompt(contextSummary: string): string {
  return `This month's data:\n${contextSummary}\n\nWrite Vinay's Monthly Executive Review.`
}
