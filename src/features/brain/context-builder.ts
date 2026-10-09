import { todayIST } from '@/lib/date'
import type { getDashboardData } from '@/features/dashboard/actions'
import type { BrainContext } from './types'

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
    practice: { questions30d: data.stats.practiced30d },
    signals: data.topActions,
  }
}
