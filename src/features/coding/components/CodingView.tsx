'use client'

import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { formatGoalsContext } from '@/features/goals/format'
import DailyCodingCard from './DailyCodingCard'
import CodingCalendar from './CodingCalendar'
import CodingSettingsPopover from './CodingSettingsPopover'
import QuestionHistory from './QuestionHistory'
import RecommendedQuestions from './RecommendedQuestions'
import TrendingReadingCard from '@/features/trending/components/TrendingReadingCard'
import GoalsCard from '@/features/goals/components/GoalsCard'
import type { ResolvedGoal } from '@/features/goals/types'
import { computeWeakAreas, type DailyQuestion, type CodingStats, type CalendarDay, type CodingSettings, type DifficultyProgressionPoint } from '../daily-core'
import type { TrendingReading } from '@/features/trending/types'

// recharts is a ~100KB client-only dependency used nowhere else on this
// page — code-split it out of the initial bundle rather than block paint.
const DifficultyProgression = dynamic(() => import('./DifficultyProgression'), {
  ssr: false,
  loading: () => <div className="h-[16.5rem] bg-surface-1 border border-surface-3 rounded-xl animate-pulse" />,
})

interface Props {
  dailyAssignment: DailyQuestion[]
  codingStats: CodingStats
  calendar: CalendarDay[]
  codingSettings: CodingSettings
  history: DailyQuestion[]
  trendingReading: TrendingReading | null
  readingHistory: TrendingReading[]
  goals: ResolvedGoal[]
  difficultyProgression: DifficultyProgressionPoint[]
}

const MODE_LABEL: Record<CodingSettings['mode'], (fixedCount: number) => string> = {
  rotation: () => 'Rotation',
  fixed: fixedCount => `Fixed · ${fixedCount}/day`,
}

export default function CodingView({ dailyAssignment, codingStats, calendar, codingSettings, history, trendingReading, readingHistory, goals, difficultyProgression }: Props) {
  const codingContext = `Current streak: ${codingStats.currentStreak}d (longest: ${codingStats.longestStreak}d). Total solved: ${codingStats.totalSolved} (${codingStats.easySolved} easy, ${codingStats.mediumSolved} medium, ${codingStats.hardSolved} hard). Completion rate: ${codingStats.completionRate}%.${formatGoalsContext(goals)}`

  const advisorOpen = useAIAdvisorOpen()
  const advisorPortal = useAIAdvisor('Code Mentor', Sparkles, (
    <ModuleRecommendations moduleLabel="Coding" context={codingContext} isOpen={advisorOpen} />
  ))

  // Deterministic (Product Principle 2), computed from `history` — already
  // fetched for Practice Log below, so this standalone card is a free read,
  // not a new query. Previously this data only surfaced inside Recommended
  // for You's pills, and only after clicking "Get Recommendations".
  const weakAreas = computeWeakAreas(history)

  return (
    <div className="space-y-5">
      {advisorPortal}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg-primary">Coding</h1>

      {/* Streak/Solved/Completion/Assignment — persistent top-level stats,
          matching the design; previously Streak/Solved lived only as small
          chips inside DailyCodingCard's header, and Assignment mode was
          never shown on the page at all (only inside the settings modal). */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider">Streak</p>
          <p className="text-lg font-bold text-fg-primary mt-0.5">🔥 {codingStats.currentStreak} days</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider">Solved</p>
          <p className="text-lg font-bold text-fg-primary mt-0.5">{codingStats.totalSolved}</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider">Completion rate</p>
          <p className="text-lg font-bold text-fg-primary mt-0.5">{codingStats.completionRate}%</p>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-fg-tertiary uppercase tracking-wider">Assignment</p>
            <p className="text-sm font-bold text-fg-primary mt-0.5 truncate">{MODE_LABEL[codingSettings.mode](codingSettings.fixed_count)}</p>
          </div>
          <CodingSettingsPopover initialSettings={codingSettings} />
        </div>
      </div>

      {weakAreas.length > 0 && (
        <Card title="Weak Areas" padding="p-3.5">
          <p className="text-xs text-fg-tertiary mb-3">Topics with ≥2 attempts where struggles recur, worst first</p>
          <div className="space-y-2.5">
            {weakAreas.slice(0, 5).map(w => (
              <div key={w.topic}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-fg-secondary">{w.topic}</span>
                  <span className="text-fg-tertiary">{w.strugglingCount} of {w.total} struggled · {w.struggleRate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div className={`h-full rounded-full ${w.struggleRate >= 60 ? 'bg-risk' : 'bg-warn'}`} style={{ width: `${w.struggleRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-3">
          <DailyCodingCard initialAssignment={dailyAssignment} stats={codingStats} />
        </div>
        <div className="lg:col-span-2">
          <TrendingReadingCard initialReading={trendingReading} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <RecommendedQuestions />
        <DifficultyProgression data={difficultyProgression} />
      </div>

      <Card title="Contribution Calendar" padding="p-3.5">
        <CodingCalendar days={calendar} />
      </Card>

      <GoalsCard module="coding" initialGoals={goals} autoMetric="coding_streak" />

      <QuestionHistory initialHistory={history} readingHistory={readingHistory} />
    </div>
  )
}
