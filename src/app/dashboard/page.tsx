import DashboardView from '@/features/dashboard/components/DashboardView'
import { getDashboardData } from '@/features/dashboard/actions'

export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardView data={data} />
}
