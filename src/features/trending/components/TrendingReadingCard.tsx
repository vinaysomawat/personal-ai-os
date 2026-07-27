'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, ExternalLink, Newspaper } from 'lucide-react'
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
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={14} className="text-accent" />
        <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wider">Daily Tech Read</h2>
      </div>

      {!reading ? (
        <EmptyState icon={Newspaper} message="No article available today — check back tomorrow." compact />
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={handleComplete} disabled={isPending || reading.completed} aria-label="Mark reading complete" className="p-1.5 -m-1.5 shrink-0">
            {reading.completed ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-fg-quaternary hover:text-accent transition-colors" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${reading.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{reading.title}</p>
            <p className="text-xs text-fg-quaternary mt-0.5">{reading.source}{reading.points ? ` · ${reading.points} points` : ''}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${reading.completed ? 'text-green-400 bg-good-soft' : 'text-fg-tertiary bg-surface-3'}`}>
            {reading.completed ? 'Read' : 'Pending'}
          </span>
          <a href={reading.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-fg-tertiary hover:text-accent transition-colors">
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  )
}
