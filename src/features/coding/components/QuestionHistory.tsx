'use client'

import { useState, useTransition } from 'react'
import { Star, RotateCcw, ExternalLink, CheckCircle2, Circle, Newspaper } from 'lucide-react'
import Card from '@/components/Card'
import { toggleFavorite, toggleRevisionFlag, markQuestionComplete } from '../daily'
import { completeReading } from '@/features/trending/actions'
import type { DailyQuestion } from '../daily-core'
import type { TrendingReading } from '@/features/trending/types'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400 bg-green-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  hard: 'text-red-400 bg-red-500/15',
}

type Filter = 'all' | 'completed' | 'pending' | 'revision' | 'favorites' | 'easy' | 'medium' | 'hard'

interface Props {
  initialHistory: DailyQuestion[]
  trendingReading?: TrendingReading | null
}

export default function QuestionHistory({ initialHistory, trendingReading }: Props) {
  const [history, setHistory] = useState(initialHistory)
  const [reading, setReading] = useState(trendingReading ?? null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [, startTransition] = useTransition()

  // The daily "Read" isn't a coding question — it has no difficulty,
  // favorite, or revision concept — so it only ever surfaces under the
  // filters where "pending/completed" actually means something.
  const showReading = !!reading && (
    filter === 'all' ||
    (filter === 'pending' && !reading.completed) ||
    (filter === 'completed' && reading.completed)
  )

  const handleReadingComplete = () => {
    if (!reading || reading.completed) return
    setReading(r => r ? { ...r, completed: true } : r)
    startTransition(async () => { await completeReading(reading.id) })
  }

  const filtered = history.filter(h => {
    if (filter === 'all') return true
    if (filter === 'completed') return h.completed
    if (filter === 'pending') return !h.completed
    if (filter === 'revision') return h.needs_revision
    if (filter === 'favorites') return h.favorite
    return h.question.difficulty === filter
  })

  const handleFavorite = (id: string) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, favorite: !h.favorite } : h))
    startTransition(async () => { await toggleFavorite(id) })
  }

  const handleRevision = (id: string) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, needs_revision: !h.needs_revision } : h))
    startTransition(async () => { await toggleRevisionFlag(id) })
  }

  const handleComplete = (id: string) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, completed: true } : h))
    startTransition(async () => { await markQuestionComplete(id) })
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'completed', label: 'Completed' }, { key: 'pending', label: 'Pending' },
    { key: 'revision', label: 'Revision' }, { key: 'favorites', label: 'Favorites' },
    { key: 'easy', label: 'Easy' }, { key: 'medium', label: 'Medium' }, { key: 'hard', label: 'Hard' },
  ]

  return (
    <Card title="Question History">
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${filter === f.key ? 'bg-accent text-white' : 'bg-surface-2 text-slate-500 hover:text-slate-300'}`}>
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 && !showReading ? (
        <p className="text-sm text-slate-600 text-center py-6">No questions match this filter.</p>
      ) : (
        <ul className="space-y-1.5 max-h-96 overflow-y-auto">
          {showReading && reading && (
            <li className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 text-accent bg-accent/15 flex items-center gap-1">
                <Newspaper size={10} /> Read
              </span>
              <span className={`flex-1 min-w-0 text-sm truncate ${reading.completed ? 'text-slate-400' : 'text-slate-300'}`}>{reading.title}</span>
              <span className="text-xs text-slate-600 shrink-0">{reading.assigned_date}</span>
              <button onClick={handleReadingComplete} disabled={reading.completed}
                className={`shrink-0 transition-colors ${reading.completed ? 'text-green-500' : 'text-slate-600 hover:text-green-400'}`}>
                {reading.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              </button>
              <a href={reading.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-600 hover:text-accent transition-colors">
                <ExternalLink size={13} />
              </a>
            </li>
          )}
          {filtered.map(h => (
            <li key={h.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${DIFFICULTY_COLOR[h.question.difficulty]}`}>{h.question.difficulty}</span>
              <span className={`flex-1 min-w-0 text-sm truncate ${h.completed ? 'text-slate-400' : 'text-slate-300'}`}>{h.question.title}</span>
              <span className="text-xs text-slate-600 shrink-0">{h.assigned_date}</span>
              <button onClick={() => !h.completed && handleComplete(h.id)} disabled={h.completed}
                className={`shrink-0 transition-colors ${h.completed ? 'text-green-500' : 'text-slate-600 hover:text-green-400'}`}>
                {h.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              </button>
              <button onClick={() => handleFavorite(h.id)} className={`shrink-0 transition-colors ${h.favorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                <Star size={13} fill={h.favorite ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => handleRevision(h.id)} className={`shrink-0 transition-colors ${h.needs_revision ? 'text-accent' : 'text-slate-600 hover:text-accent'}`}>
                <RotateCcw size={13} />
              </button>
              <a href={h.question.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-600 hover:text-accent transition-colors">
                <ExternalLink size={13} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
