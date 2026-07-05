import HealthView from '@/features/health/components/HealthView'
import { getHabitsWithLogs, getHealthMetrics } from '@/features/health/actions'

export default async function HealthPage() {
  const [habits, metrics] = await Promise.all([
    getHabitsWithLogs(),
    getHealthMetrics(30),
  ])
  return <HealthView initialHabits={habits} initialMetrics={metrics} />
}
