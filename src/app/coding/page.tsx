import CodingView from '@/features/coding/components/CodingView'
import { getTodayAssignment, getCodingStats, getCodingCalendarData, getCodingSettings, getAssignmentHistory, getInsightsHistory } from '@/features/coding/daily'
import { computeDifficultyProgression } from '@/features/coding/daily-core'
import { getGoals } from '@/features/goals/actions'

export default async function CodingPage() {
  const [dailyAssignment, codingStats, calendar, codingSettings, history, goals, insightsHistory] = await Promise.all([
    getTodayAssignment(),
    getCodingStats(),
    getCodingCalendarData(),
    getCodingSettings(),
    getAssignmentHistory(),
    getGoals('coding'),
    getInsightsHistory(),
  ])
  return (
    <CodingView
      dailyAssignment={dailyAssignment}
      codingStats={codingStats}
      calendar={calendar}
      codingSettings={codingSettings}
      history={history}
      goals={goals}
      difficultyProgression={computeDifficultyProgression(insightsHistory)}
    />
  )
}
