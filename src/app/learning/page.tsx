import LearningView from '@/features/learning/components/LearningView'
import { getLearningData } from '@/features/learning/actions'

export default async function LearningPage() {
  const { resources, studyLogs } = await getLearningData()
  return <LearningView initialResources={resources} initialStudyLogs={studyLogs} />
}
