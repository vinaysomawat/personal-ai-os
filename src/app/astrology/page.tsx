import AstrologyView from '@/features/astrology/components/AstrologyView'
import { getAstrologyProfile } from '@/features/astrology/actions'

export default async function AstrologyPage() {
  const profile = await getAstrologyProfile()
  return <AstrologyView initialProfile={profile} />
}
