import CodingView from '@/features/coding/components/CodingView'
import { getTodayAssignment, getCodingStats, getCodingCalendarData, getCodingSettings, getAssignmentHistory } from '@/features/coding/daily'
import { getGoals } from '@/features/goals/actions'

export default async function CodingPage() {
  const [dailyAssignment, codingStats, calendar, codingSettings, history, goals] = await Promise.all([
    getTodayAssignment(),
    getCodingStats(),
    getCodingCalendarData(),
    getCodingSettings(),
    getAssignmentHistory(),
    getGoals('coding'),
  ])
  return (
    <CodingView
      dailyAssignment={dailyAssignment}
      codingStats={codingStats}
      calendar={calendar}
      codingSettings={codingSettings}
      history={history}
      goals={goals}
    />
  )
}
