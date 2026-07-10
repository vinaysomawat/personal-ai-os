'use client'

import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import DailyCodingCard from './DailyCodingCard'
import CodingCalendar from './CodingCalendar'
import CodingSettingsPopover from './CodingSettingsPopover'
import QuestionHistory from './QuestionHistory'
import type { DailyQuestion, CodingStats, CalendarDay, CodingSettings } from '../daily-core'

interface Props {
  dailyAssignment: DailyQuestion[]
  codingStats: CodingStats
  calendar: CalendarDay[]
  codingSettings: CodingSettings
  history: DailyQuestion[]
}

export default function CodingView({ dailyAssignment, codingStats, calendar, codingSettings, history }: Props) {
  return (
    <div className="space-y-5">
      <DailyCodingCard initialAssignment={dailyAssignment} stats={codingStats} />

      <Card title="Contribution Calendar" action={<CodingSettingsPopover initialSettings={codingSettings} />}>
        <CodingCalendar days={calendar} />
      </Card>

      <QuestionHistory initialHistory={history} />

      <ModuleRecommendations moduleLabel="Coding" context={`Current streak: ${codingStats.currentStreak}d (longest: ${codingStats.longestStreak}d). Total solved: ${codingStats.totalSolved} (${codingStats.easySolved} easy, ${codingStats.mediumSolved} medium, ${codingStats.hardSolved} hard). Completion rate: ${codingStats.completionRate}%.`} />
    </div>
  )
}
