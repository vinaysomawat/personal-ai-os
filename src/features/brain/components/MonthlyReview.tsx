'use client'

import { useEffect, useState } from 'react'
import { getMonthlyReview, type MonthlyReviewResult } from '../advisor'
import ScoreStatsSummary from './ScoreStatsSummary'
import MonthlyReviewCard from './MonthlyReviewCard'
import type { BrainContext } from '../types'

export default function MonthlyReview({ context }: { context: BrainContext }) {
  const [data, setData] = useState<MonthlyReviewResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getMonthlyReview(context).then(result => { if (!cancelled) { setData(result); setLoading(false) } })
    return () => { cancelled = true }
  }, [context])

  if (loading) {
    return (
      <div className="space-y-2">
        {[95, 100, 80, 90, 60, 70].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
      </div>
    )
  }

  if (!data) return null
  const { review, stats } = data

  return (
    <div className="flex flex-col gap-3.5">
      {stats && <ScoreStatsSummary {...stats} totalDays={30} periodLabel="This month" />}
      <MonthlyReviewCard review={review} />
    </div>
  )
}
