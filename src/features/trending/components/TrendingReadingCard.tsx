'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, ExternalLink, Newspaper } from 'lucide-react'
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
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Daily Tech Read</h2>
      </div>

      {!reading ? (
        <p className="text-sm text-slate-600 text-center py-4">No article available today — check back tomorrow.</p>
      ) : (
        <div className="flex items-center gap-3">
          <button onClick={handleComplete} disabled={isPending || reading.completed} className="shrink-0">
            {reading.completed ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-slate-600 hover:text-accent transition-colors" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${reading.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{reading.title}</p>
            <p className="text-xs text-slate-600 mt-0.5">{reading.source}{reading.points ? ` · ${reading.points} points` : ''}</p>
          </div>
          <a href={reading.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-500 hover:text-accent transition-colors">
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  )
}
