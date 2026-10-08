import CareerView from '@/features/career/components/CareerView'
import { getCareerData } from '@/features/career/actions'

export default async function CareerPage() {
  const data = await getCareerData()
  return <CareerView {...data} />
}
