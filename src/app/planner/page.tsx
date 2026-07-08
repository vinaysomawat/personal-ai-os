import PlannerView from '@/features/planner/components/PlannerView'
import { getTasks, getTodaysFocusSessions } from '@/features/planner/actions'

export default async function PlannerPage() {
  const [tasks, focusSessions] = await Promise.all([getTasks(), getTodaysFocusSessions()])
  return <PlannerView initialTasks={tasks} initialFocusSessions={focusSessions} />
}
