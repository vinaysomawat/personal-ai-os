import DashboardView from '@/features/dashboard/components/DashboardView'
import { getDashboardData } from '@/features/dashboard/actions'
import { getDailyBriefing } from '@/features/ai/briefing'

export default async function DashboardPage() {
  const [data, briefing] = await Promise.all([
    getDashboardData(),
    getDailyBriefing(),
  ])
  return <DashboardView data={data} briefing={briefing} />
}
