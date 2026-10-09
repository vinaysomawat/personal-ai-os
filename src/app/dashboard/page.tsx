import DashboardView from '@/features/dashboard/components/DashboardView'
import { getDashboardData, getHuntHero } from '@/features/dashboard/actions'
import { getExecutiveData } from '@/features/brain/executive-actions'

export default async function DashboardPage() {
  const [data, executive, hunt] = await Promise.all([getDashboardData(), getExecutiveData(), getHuntHero()])
  return <DashboardView data={data} executive={executive} hunt={hunt} />
}
