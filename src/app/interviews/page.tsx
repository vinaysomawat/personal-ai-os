import CareerView from '@/features/career/components/CareerView'
import { getCareerData } from '@/features/career/actions'

export default async function CareerPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, data] = await Promise.all([searchParams, getCareerData()])
  return <CareerView {...data} initialTab={tab} />
}
