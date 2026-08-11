import CodingView from '@/features/coding/components/CodingView'
import { getTodayAssignment, getCodingStats, getCodingCalendarData, getCodingSettings, getAssignmentHistory } from '@/features/coding/daily'
import { getTodaysQuizData } from '@/features/coding/todays-quiz-actions'

export default async function CodingPage() {
  const [dailyAssignment, codingStats, calendar, codingSettings, history, quiz] = await Promise.all([
    getTodayAssignment(),
    getCodingStats(),
    getCodingCalendarData(),
    getCodingSettings(),
    getAssignmentHistory(),
    getTodaysQuizData(),
  ])
  return (
    <CodingView
      dailyAssignment={dailyAssignment}
      codingStats={codingStats}
      calendar={calendar}
      codingSettings={codingSettings}
      history={history}
      quizQuestions={quiz.questions}
      quizAttempt={quiz.attempt}
    />
  )
}
