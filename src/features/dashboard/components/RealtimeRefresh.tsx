'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Refreshes the dashboard server data when workouts or health metrics change
// (e.g. after logging via Telegram bot)
export default function RealtimeRefresh() {
  const router = useRouter()
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = () => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => router.refresh(), 1500)
  }

  useEffect(() => {
    const supabase = createClient()

    const workoutSub = supabase
      .channel('workouts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, refresh)
      .subscribe()

    const metricSub = supabase
      .channel('health_metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_metrics' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(workoutSub)
      supabase.removeChannel(metricSub)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
