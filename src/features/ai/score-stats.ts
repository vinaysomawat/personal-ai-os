export type ScoreLogRow = { date: string; life_score: number; health_score: number; finance_score: number; career_score: number; learning_score: number; projects_score: number }

export interface ScoreStats {
  daysTracked: number
  avgLife: number
  moduleAvgs: { Health: number; Finance: number; Career: number; Projects: number }
  best: { date: string; score: number }
  worst: { date: string; score: number }
  topModule: [string, number]
  weakModule: [string, number]
}

// Shared aggregation for both the weekly/monthly Telegram digest
// (features/ai/weekly-digest.ts) and the in-app Weekly Reflection (Phase 2
// Brain PRD) — one place computing these numbers so both surfaces agree
// (Core Principle 2: no duplicate business logic). Plain module (no "use
// server") since weekly-digest.ts can only export async functions.
export function computeScoreStats(logs: ScoreLogRow[]): ScoreStats {
  const avg = (key: keyof ScoreLogRow) => Math.round(logs.reduce((s, r) => s + (r[key] as number), 0) / logs.length)

  const avgLife    = avg('life_score')
  const moduleAvgs = {
    Health: avg('health_score'), Finance: avg('finance_score'), Career: avg('career_score'),
    Projects: avg('projects_score'),
  }

  const best  = logs.reduce((a, b) => a.life_score > b.life_score ? a : b)
  const worst = logs.reduce((a, b) => a.life_score < b.life_score ? a : b)

  const topModule  = Object.entries(moduleAvgs).sort(([, a], [, b]) => b - a)[0] as [string, number]
  const weakModule = Object.entries(moduleAvgs).sort(([, a], [, b]) => a - b)[0] as [string, number]

  return {
    daysTracked: logs.length, avgLife, moduleAvgs,
    best: { date: best.date, score: best.life_score },
    worst: { date: worst.date, score: worst.life_score },
    topModule, weakModule,
  }
}

// Shared with the Telegram digest's formatSpend() and Monthly Executive
// Review's top-spend-category line — highest-spend category first.
export function computeCategoryTotals(expenses: { amount: number; category: string }[]): [string, number][] {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    const amt = Number(e.amount ?? 0)
    totals.set(e.category, (totals.get(e.category) ?? 0) + amt)
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])
}
