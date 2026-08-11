import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST, daysAgoIST } from '@/lib/date'
import { computeScoreStats, computeCategoryTotals } from '@/features/ai/score-stats'
import { getRecentPatterns } from './signals'
import type { getDashboardData } from '@/features/dashboard/actions'
import type { BrainContext, WeeklyReflectionContext, MonthlyReviewContext } from './types'

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

// Single place every Brain feature (Daily Mission, Explain My Score, and
// later Ask Brain / Decision Engine) reads context from — reshapes the
// dashboard's existing aggregate query into the PRD's stated Context shape.
// Deliberately takes already-fetched data rather than a supabase client:
// the dashboard page already pays for these queries every load, so Brain
// features composed alongside it (same render) must reuse that result
// instead of querying twice.
export function buildBrainContext(data: DashboardData): BrainContext {
  return {
    today: todayIST(),
    lifeScore: data.scores.life,
    planner: { pendingTaskCount: data.stats.pendingTaskCount },
    career: {
      activeApplications: data.stats.activeApplications,
      currentRole: data.careerMemory.currentRole,
      currentCompany: data.careerMemory.currentCompany,
      targetRole: data.careerMemory.targetRole,
      currentSalary: data.careerMemory.currentSalary,
      bio: data.careerMemory.bio,
    },
    finance: { monthSpend: data.stats.monthSpend, monthBudget: data.stats.monthBudget, goals: data.financialGoals },
    health: { workoutsToday: data.stats.workoutsToday, todayMetric: data.todayHealth },
    learning: { inProgress: data.stats.learningInProgress },
    coding: { solved30d: data.stats.codingSolved30d },
    documents: { count: data.stats.documentCount },
    signals: data.topActions,
    weeklyPatterns: data.recentPatterns.map(p => p.pattern),
    monthlyPatterns: [],
  }
}

// Trailing-7-days counterpart to buildBrainContext's today snapshot — feeds
// Weekly Reflection. Runs the exact same life_score_logs query the Telegram
// weekly digest already does (through the shared computeScoreStats), just
// on demand instead of only on the Sunday cron. Returns null when there
// isn't enough logged data to say anything meaningful yet.
export async function getWeeklyReflectionContext(supabase: SupabaseClient, userId: string): Promise<WeeklyReflectionContext | null> {
  const since = daysAgoIST(7)
  const [{ data: logs }, patterns] = await Promise.all([
    supabase
      .from('life_score_logs')
      .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true }),
    getRecentPatterns(supabase, userId),
  ])

  if (!logs || logs.length < 2) return null

  const { daysTracked, avgLife, moduleAvgs, best, worst } = computeScoreStats(logs)
  return { daysTracked, avgLife, moduleAvgs, best, worst, patterns: patterns.map(p => p.pattern) }
}

// Trailing-30-days counterpart, feeding Monthly Executive Review. Same
// life_score_logs aggregation as above with a wider window, plus this
// calendar month's top spend category — the one number not already sitting
// in BrainContext (which only has the month's total, not a breakdown).
// Career/Finance-total/Learning/Coding figures are read from the caller's
// already-built BrainContext instead of re-querying them here.
export async function getMonthlyReviewContext(supabase: SupabaseClient, userId: string): Promise<MonthlyReviewContext | null> {
  const since = daysAgoIST(30)
  const monthStart = todayIST().slice(0, 7) + '-01'

  const [{ data: logs }, { data: expenses }, patterns] = await Promise.all([
    supabase
      .from('life_score_logs')
      .select('date, life_score, health_score, finance_score, career_score, learning_score, projects_score')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase.from('expenses').select('amount, category').eq('user_id', userId).gte('date', monthStart),
    getRecentPatterns(supabase, userId),
  ])

  if (!logs || logs.length < 5) return null

  const { daysTracked, avgLife, moduleAvgs, best, worst, topModule, weakModule } = computeScoreStats(logs)
  const categoryTotals = computeCategoryTotals(expenses ?? [])
  const topSpendCategory = categoryTotals.length > 0 ? { name: categoryTotals[0][0], amount: categoryTotals[0][1] } : null

  return { daysTracked, avgLife, moduleAvgs, best, worst, topModule, weakModule, topSpendCategory, patterns: patterns.map(p => p.pattern) }
}
