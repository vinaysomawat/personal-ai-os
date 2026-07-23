'use client'

import { useState, useTransition } from 'react'
import { Star, RotateCcw, ExternalLink, CheckCircle2, Circle, Newspaper, SearchX } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import FilterPill from '@/components/FilterPill'
import { toggleFavorite, toggleRevisionFlag, markQuestionComplete } from '../daily'
import { completeReading } from '@/features/trending/actions'
import OutcomeModal from './OutcomeModal'
import type { DailyQuestion, Outcome } from '../daily-core'
import type { TrendingReading } from '@/features/trending/types'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400 bg-green-500/15',
  medium: 'text-amber-400 bg-amber-500/15',
  hard: 'text-red-400 bg-red-500/15',
}

type Filter = 'all' | 'completed' | 'pending' | 'revision' | 'favorites' | 'easy' | 'medium' | 'hard'

interface Props {
  initialHistory: DailyQuestion[]
  readingHistory?: TrendingReading[]
}

export default function QuestionHistory({ initialHistory, readingHistory }: Props) {
  const [history, setHistory] = useState(initialHistory)
  const [readings, setReadings] = useState(readingHistory ?? [])
  const [filter, setFilter] = useState<Filter>('pending')
  const [, startTransition] = useTransition()
  const [outcomeFor, setOutcomeFor] = useState<DailyQuestion | null>(null)

  // The daily "Read" isn't a coding question — it has no difficulty,
  // favorite, or revision concept — so it only ever surfaces under the
  // filters where "pending/completed" actually means something. Includes
  // every unfinished day's reading, not just today's, so an unread article
  // doesn't silently vanish from the queue once its day passes.
  const filteredReadings = readings.filter(r => {
    if (filter === 'all') return true
    if (filter === 'completed') return r.completed
    if (filter === 'pending') return !r.completed
    return false
  })

  const handleReadingComplete = (id: string) => {
    setReadings(prev => prev.map(r => r.id === id ? { ...r, completed: true } : r))
    startTransition(async () => { await completeReading(id) })
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

  const finishComplete = (id: string, outcome?: Outcome) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, completed: true, outcome: outcome ?? null } : h))
    setOutcomeFor(null)
    startTransition(async () => { await markQuestionComplete(id, outcome ? { outcome } : undefined) })
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'completed', label: 'Completed' }, { key: 'pending', label: 'Pending' },
    { key: 'revision', label: 'Revision' }, { key: 'favorites', label: 'Favorites' },
    { key: 'easy', label: 'Easy' }, { key: 'medium', label: 'Medium' }, { key: 'hard', label: 'Hard' },
  ]

  return (
    <Card title="Practice Log" padding="p-3.5">
      <div className="flex gap-1.5 flex-wrap mb-4">
        {filters.map(f => (
          <FilterPill key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
        ))}
      </div>
      {filtered.length === 0 && filteredReadings.length === 0 ? (
        <EmptyState icon={SearchX} message="No questions match this filter." compact />
      ) : (
        <ul className="space-y-1.5 max-h-96 overflow-y-auto">
          {filteredReadings.map(reading => (
            <li key={reading.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 text-accent bg-accent/15 flex items-center gap-1">
                <Newspaper size={10} /> Read
              </span>
              <span className={`flex-1 min-w-0 text-sm truncate ${reading.completed ? 'text-slate-400' : 'text-slate-300'}`}>{reading.title}</span>
              <span className="text-xs text-slate-600 shrink-0">{reading.assigned_date}</span>
              <button onClick={() => handleReadingComplete(reading.id)} disabled={reading.completed} aria-label="Mark reading complete"
                className={`p-1.5 -m-1.5 shrink-0 transition-colors ${reading.completed ? 'text-green-500' : 'text-slate-600 hover:text-green-400'}`}>
                {reading.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              </button>
              <a href={reading.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-600 hover:text-accent transition-colors">
                <ExternalLink size={13} />
              </a>
            </li>
          ))}
          {filtered.map(h => (
            <li key={h.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${DIFFICULTY_COLOR[h.question.difficulty]}`}>{h.question.difficulty}</span>
              <span className={`flex-1 min-w-0 text-sm truncate ${h.completed ? 'text-slate-400' : 'text-slate-300'}`}>{h.question.title}</span>
              <span className="text-xs text-slate-600 shrink-0">{h.assigned_date}</span>
              <button onClick={() => !h.completed && setOutcomeFor(h)} disabled={h.completed} aria-label="Mark question complete"
                className={`p-1.5 -m-1.5 shrink-0 transition-colors ${h.completed ? 'text-green-500' : 'text-slate-600 hover:text-green-400'}`}>
                {h.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              </button>
              <button onClick={() => handleFavorite(h.id)} aria-label={h.favorite ? 'Unfavorite question' : 'Favorite question'} className={`p-1.5 -m-1.5 shrink-0 transition-colors ${h.favorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
                <Star size={13} fill={h.favorite ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => handleRevision(h.id)} aria-label={h.needs_revision ? 'Unflag for revision' : 'Flag for revision'} className={`p-1.5 -m-1.5 shrink-0 transition-colors ${h.needs_revision ? 'text-accent' : 'text-slate-600 hover:text-accent'}`}>
                <RotateCcw size={13} />
              </button>
              <a href={h.question.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-600 hover:text-accent transition-colors">
                <ExternalLink size={13} />
              </a>
            </li>
          ))}
        </ul>
      )}
      {outcomeFor && (
        <OutcomeModal
          title={outcomeFor.question.title}
          onPick={outcome => finishComplete(outcomeFor.id, outcome)}
          onSkip={() => finishComplete(outcomeFor.id)}
          onClose={() => setOutcomeFor(null)}
        />
      )}
    </Card>
  )
}
