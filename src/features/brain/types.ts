export type ScoreModule = 'health' | 'finance' | 'career' | 'projects'

export interface ScoreHistoryEntry {
  date: string
  life: number
  health: number
  finance: number
  career: number
  projects: number
}

// Life Score v2 (2026-08-23) — each module's line shows both halves of the
// blend (today's fresh raw score and the trailing-7-day average), not just
// the final blended number, so "why did this move" stays legible.
export interface ScoreExplanation {
  module: ScoreModule
  label: string
  today: number
  weeklyAvg: number
  blended: number
  delta: number | null
  tip: string
}

export interface ScoreExplanationResult {
  life: { score: number; delta: number | null }
  modules: ScoreExplanation[]
}

export interface BrainContext {
  today: string
  lifeScore: number
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
  practice: { questions30d: number }
  signals: { emoji: string; text: string; href: string }[]
}
