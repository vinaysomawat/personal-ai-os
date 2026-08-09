import CodingView from '@/features/coding/components/CodingView'
import { getTodayAssignment, getCodingStats, getCodingCalendarData, getCodingSettings, getAssignmentHistory } from '@/features/coding/daily'
import { getGoals } from '@/features/goals/actions'
import { getTodaysQuizData } from '@/features/coding/todays-quiz-actions'

export default async function CodingPage() {
  const [dailyAssignment, codingStats, calendar, codingSettings, history, goals, quiz] = await Promise.all([
    getTodayAssignment(),
    getCodingStats(),
    getCodingCalendarData(),
    getCodingSettings(),
    getAssignmentHistory(),
    getGoals('coding'),
    getTodaysQuizData(),
  ])
  return (
    <CodingView
      dailyAssignment={dailyAssignment}
      codingStats={codingStats}
      calendar={calendar}
      codingSettings={codingSettings}
      history={history}
      goals={goals}
      quizQuestions={quiz.questions}
      quizAttempt={quiz.attempt}
    />
  )
}
