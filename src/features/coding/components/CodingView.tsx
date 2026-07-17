'use client'

import { Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import DailyCodingCard from './DailyCodingCard'
import CodingCalendar from './CodingCalendar'
import CodingSettingsPopover from './CodingSettingsPopover'
import QuestionHistory from './QuestionHistory'
import TrendingReadingCard from '@/features/trending/components/TrendingReadingCard'
import type { DailyQuestion, CodingStats, CalendarDay, CodingSettings } from '../daily-core'
import type { TrendingReading } from '@/features/trending/types'

interface Props {
  dailyAssignment: DailyQuestion[]
  codingStats: CodingStats
  calendar: CalendarDay[]
  codingSettings: CodingSettings
  history: DailyQuestion[]
  trendingReading: TrendingReading | null
}

export default function CodingView({ dailyAssignment, codingStats, calendar, codingSettings, history, trendingReading }: Props) {
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

      <Card title="Contribution Calendar" action={<CodingSettingsPopover initialSettings={codingSettings} />}>
        <CodingCalendar days={calendar} />
      </Card>

      <QuestionHistory initialHistory={history} trendingReading={trendingReading} />
    </div>
  )
}
