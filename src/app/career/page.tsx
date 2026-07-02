import CareerView from '@/features/career/components/CareerView'
import { getApplications } from '@/features/career/actions'

export default async function CareerPage() {
  const applications = await getApplications()
  return <CareerView initialApplications={applications} />
}
