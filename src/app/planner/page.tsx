import PlannerView from '@/features/planner/components/PlannerView'
import { getTasks } from '@/features/planner/actions'

export default async function PlannerPage() {
  const tasks = await getTasks()
  return <PlannerView initialTasks={tasks} />
}
