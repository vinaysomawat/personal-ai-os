'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Newspaper } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { completeReading } from '../actions'
import type { TrendingReading } from '../types'

export default function TrendingReadingCard({ initialReading }: { initialReading: TrendingReading | null }) {
  const [reading, setReading] = useState(initialReading)
  const [isPending, startTransition] = useTransition()

  const handleComplete = () => {
    if (!reading || reading.completed) return
    setReading(r => r ? { ...r, completed: true } : r)
    startTransition(async () => { await completeReading(reading.id) })
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
      <div className="flex items-center justify-between gap-2.5 mb-2.5">
        <h2 className="text-[13px] font-bold text-fg-primary whitespace-nowrap">Daily Tech Read</h2>
        {reading && (
          <span className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[6px] bg-border whitespace-nowrap ${reading.completed ? 'text-green-400' : 'text-amber-400'}`}>
            {reading.completed ? 'Read' : 'Pending'}
          </span>
        )}
      </div>

      {!reading ? (
        <EmptyState icon={Newspaper} message="No article available today — check back tomorrow." compact />
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <p className={`text-[14px] font-semibold ${reading.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{reading.title}</p>
            <a href={reading.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-fg-tertiary hover:text-accent transition-colors">
              <ExternalLink size={12} />
            </a>
          </div>
          <p className="text-[12.5px] text-fg-tertiary mt-0.5">{reading.source}{reading.points ? ` · ${reading.points} points` : ''}</p>
          {!reading.completed && (
            <div className="flex gap-2 mt-3.5">
              <button onClick={handleComplete} disabled={isPending} className="px-3.5 py-2 rounded-[7px] bg-good text-on-good text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
                Mark Read
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
