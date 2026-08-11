export type ScoreModule = 'health' | 'finance' | 'career' | 'learning' | 'projects'

export interface ScoreHistoryEntry {
  date: string
  life: number
  health: number
  finance: number
  career: number
  learning: number
  projects: number
}

export interface ScoreExplanation {
  module: ScoreModule
  label: string
  score: number
  delta: number | null
  tip: string
}

export interface ScoreExplanationResult {
  life: { score: number; delta: number | null }
  modules: ScoreExplanation[]
}

export interface Decision {
  decision: string
  reasoning: string
  tradeoffs: string[]
  confidence: 'high' | 'medium' | 'low'
  actionItems: string[]
}

// Feeds Weekly Reflection — the trailing-7-days counterpart to BrainContext's
// today snapshot. Built from the same life_score_logs aggregation the
// Telegram weekly digest already computes (computeScoreStats), never a
// second/duplicate calculation.
export interface WeeklyReflectionContext {
  daysTracked: number
  avgLife: number
  moduleAvgs: { Health: number; Finance: number; Career: number; Learning: number; Projects: number }
  best: { date: string; score: number }
  worst: { date: string; score: number }
  patterns: string[]
}

// Feeds Monthly Executive Review — the trailing-30-days counterpart, same
// shape as Weekly plus the top/weak module and this calendar month's top
// spend category (the one piece not already sitting in BrainContext).
export interface MonthlyReviewContext {
  daysTracked: number
  avgLife: number
  moduleAvgs: { Health: number; Finance: number; Career: number; Learning: number; Projects: number }
  best: { date: string; score: number }
  worst: { date: string; score: number }
  topModule: [string, number]
  weakModule: [string, number]
  topSpendCategory: { name: string; amount: number } | null
  patterns: string[]
}

// Structured output for the Monthly tab — unlike Weekly Reflection's single
// paragraph, the PRD asks for discrete fields (Career/Finance/Health/
// Learning/Coding/Overall + achievement/mistake/recommendation).
export interface MonthlyReview {
  career: string
  finance: string
  health: string
  learning: string
  coding: string
  overall: string
  biggestAchievement: string
  biggestMistake: string
  recommendation: string
}

// Reshapes getDashboardData()'s already-fetched, already-summarized output
// into the "Unified Context" shape from PRDs/phase2.md — no new queries here,
// per Core Principle 2 (the Brain never duplicates business logic or
// re-fetches raw rows, it consumes each module's already-computed outputs).
export interface BrainContext {
  today: string
  lifeScore: number
  planner: { pendingTaskCount: number }
  career: {
    activeApplications: number
    // "Memory" (Phase 2 PRD) — read straight from career_profile, the Brain
    // doesn't own or duplicate this data, per Core Principle 1.
    currentRole: string | null
    currentCompany: string | null
    targetRole: string | null
    currentSalary: number | null
    // "Memory" (Phase 4 PRD's Executive Memory) — the Career profile's
    // existing free-text Bio/Focus field, read straight through same as the
    // rest of this block. Not fed into weekly/monthly review (those are
    // number-focused retrospectives, not a "who are you" personality note).
    bio: string | null
  }
  finance: {
    monthSpend: number
    monthBudget: number
    // "Memory" (Phase 3 PRD's Memory Evolution) — Goals, read straight from
    // financial_goals, the Brain doesn't own or duplicate this data either.
    goals: { name: string; targetAmount: number; currentAmount: number; targetDate: string | null }[]
  }
  health: { workoutsToday: number; todayMetric: Record<string, unknown> | null }
  learning: { inProgress: number }
  coding: { solved30d: number }
  documents: { count: number }
  signals: { emoji: string; text: string; href: string }[]
  weeklyPatterns: string[]
  // Not populated yet — no monthly-cadence pattern job exists (only the
  // weekly one), kept here so the shape matches the PRD without a breaking change later.
  monthlyPatterns: string[]
}
