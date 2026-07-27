'use client'

import { useState } from 'react'
import { Sparkles, ExternalLink, Plus } from 'lucide-react'
import Card from '@/components/Card'
import { getCodingRecommendations, type CodingRecommendation } from '../recommendations'
import { addRecommendedQuestion } from '../daily'
import type { WeakArea } from '../daily-core'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400 bg-good-soft',
  medium: 'text-amber-400 bg-warn-soft',
  hard: 'text-red-400 bg-risk-soft',
}

// Separate from the daily-assignment card (DailyCodingCard) rather than
// replacing its rotation — these are opt-in picks the user chooses from,
// not an auto-assigned question. See recommendations.ts for the
// deterministic-prep-then-AI-ranks-from-it split.
export default function RecommendedQuestions() {
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [recommendations, setRecommendations] = useState<CodingRecommendation[]>([])
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])
  const [company, setCompany] = useState<{ company: string; topics: string[] } | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const handleLoad = async () => {
    setLoading(true)
    try {
      const result = await getCodingRecommendations()
      setRecommendations(result.recommendations)
      setWeakAreas(result.weakAreas)
      setCompany(result.company)
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (rec: CodingRecommendation) => {
    setAddedIds(prev => new Set(prev).add(rec.question.id))
    addRecommendedQuestion(rec.question)
  }

  return (
    <Card title="Recommended for You" padding="p-3.5" action={
      <button onClick={handleLoad} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
        <Sparkles size={12} /> {loading ? 'Thinking...' : loaded ? 'Refresh' : 'Get Recommendations'}
      </button>
    }>
      {!loaded && !loading && (
        <p className="text-sm text-fg-tertiary">Picks weighted toward your weak areas, an active application&apos;s priority topics, and current interview trends — from your existing question pool, never invented.</p>
      )}

      {loading && (
        <div className="space-y-2 py-2">{[85, 65, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>
      )}

      {loaded && !loading && (
        <div className="space-y-3">
          {weakAreas.length > 0 && (
            <div>
              <p className="text-xs text-fg-quaternary uppercase tracking-wider mb-1.5">Weak Areas</p>
              <div className="flex flex-wrap gap-1">
                {weakAreas.slice(0, 5).map(w => (
                  <span key={w.topic} className="text-xs px-1.5 py-0.5 rounded-full bg-risk-soft text-red-400">{w.topic} ({w.struggleRate}%)</span>
                ))}
              </div>
            </div>
          )}
          {company && (
            <p className="text-xs text-fg-tertiary">Also weighted for <span className="text-accent font-medium">{company.company}</span>&apos;s priority topics: {company.topics.join(', ')}</p>
          )}

          {recommendations.length === 0 ? (
            <p className="text-sm text-fg-tertiary">No recommendations right now — try again after solving a few more questions.</p>
          ) : (
            <ul className="space-y-1.5">
              {recommendations.map(rec => {
                const added = addedIds.has(rec.question.id)
                return (
                  <li key={rec.question.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-2 border border-surface-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${DIFFICULTY_COLOR[rec.question.difficulty]}`}>{rec.question.difficulty}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-fg-primary">{rec.question.title}</span>
                        <a href={rec.question.url} target="_blank" rel="noopener noreferrer" className="text-fg-quaternary hover:text-accent transition-colors shrink-0"><ExternalLink size={11} /></a>
                      </div>
                      <p className="text-xs text-fg-tertiary mt-0.5">{rec.reason}</p>
                    </div>
                    <button onClick={() => handleAdd(rec)} disabled={added}
                      className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-surface-3 text-fg-secondary hover:text-accent hover:border-accent/40 disabled:opacity-50 transition-colors">
                      {added ? 'Added' : <><Plus size={11} /> Add</>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
