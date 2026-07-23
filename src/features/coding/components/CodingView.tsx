'use client'

import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import DailyCodingCard from './DailyCodingCard'
import CodingCalendar from './CodingCalendar'
import CodingSettingsPopover from './CodingSettingsPopover'
import QuestionHistory from './QuestionHistory'
import RecommendedQuestions from './RecommendedQuestions'
import TrendingReadingCard from '@/features/trending/components/TrendingReadingCard'
import GoalsCard from '@/features/goals/components/GoalsCard'
import type { ResolvedGoal } from '@/features/goals/types'
import type { DailyQuestion, CodingStats, CalendarDay, CodingSettings, DifficultyProgressionPoint } from '../daily-core'
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

export default function CodingView({ dailyAssignment, codingStats, calendar, codingSettings, history, trendingReading, readingHistory, goals, difficultyProgression }: Props) {
  const codingContext = `Current streak: ${codingStats.currentStreak}d (longest: ${codingStats.longestStreak}d). Total solved: ${codingStats.totalSolved} (${codingStats.easySolved} easy, ${codingStats.mediumSolved} medium, ${codingStats.hardSolved} hard). Completion rate: ${codingStats.completionRate}%.`

  const advisorOpen = useAIAdvisorOpen()
  const advisorPortal = useAIAdvisor('Code Mentor', Sparkles, (
    <ModuleRecommendations moduleLabel="Coding" context={codingContext} isOpen={advisorOpen} />
  ))

  return (
    <div className="space-y-5">
      {advisorPortal}
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

      <Card title="Contribution Calendar" padding="p-3.5" action={<CodingSettingsPopover initialSettings={codingSettings} />}>
        <CodingCalendar days={calendar} />
      </Card>

      <GoalsCard module="coding" initialGoals={goals} autoMetric="coding_streak" />

      <QuestionHistory initialHistory={history} readingHistory={readingHistory} />
    </div>
  )
}
