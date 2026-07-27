'use client'

import { useEffect, useState } from 'react'
import { getWeeklyReflection, type WeeklyReflection } from '../advisor'
import ScoreStatsSummary from './ScoreStatsSummary'

export default function WeeklyReview() {
  const [data, setData] = useState<WeeklyReflection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getWeeklyReflection().then(result => { if (!cancelled) { setData(result); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[95, 100, 80, 90, 60].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
      </div>
    )
  }

  if (!data) return null
  const { paragraph, stats } = data

  return (
    <div className="space-y-3">
      {stats && <ScoreStatsSummary {...stats} totalDays={7} />}
      <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">{paragraph}</p>
    </div>
  )
}
