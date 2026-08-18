import LearningView from '@/features/learning/components/LearningView'
import { getLearningData, getLearningCalendarData } from '@/features/learning/actions'

export default async function LearningPage() {
  const [{ resources, studyLogs, resourceQuizAttempts }, calendar] = await Promise.all([
    getLearningData(),
    getLearningCalendarData(),
  ])
  return <LearningView initialResources={resources} initialStudyLogs={studyLogs} initialQuizAttempts={resourceQuizAttempts} calendar={calendar} />
}
