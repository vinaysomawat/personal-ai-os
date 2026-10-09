import AstrologyView from '@/features/astrology/components/AstrologyView'
import { getAstrologyProfile } from '@/features/astrology/actions'
import { createClient } from '@/lib/supabase/server'
import { isHuntMode } from '@/features/prep/hunt'

export default async function AstrologyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [profile, hunt] = await Promise.all([getAstrologyProfile(), user ? isHuntMode(supabase, user.id) : false])
  return <AstrologyView initialProfile={profile} huntMode={hunt} />
}
