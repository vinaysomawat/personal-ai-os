import DashboardView from '@/features/dashboard/components/DashboardView'
import { getDashboardData } from '@/features/dashboard/actions'
import { getExecutiveData } from '@/features/brain/executive-actions'

export default async function DashboardPage() {
  const [data, executive] = await Promise.all([getDashboardData(), getExecutiveData()])
  return <DashboardView data={data} executive={executive} />
}
