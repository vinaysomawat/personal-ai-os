'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Moon } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { markQuestionComplete } from '../daily'
import OutcomeModal from './OutcomeModal'
import type { DailyQuestion, CodingStats, Outcome } from '../daily-core'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-amber-400',
  hard: 'text-red-400',
}

interface Props {
  initialAssignment: DailyQuestion[]
  stats: CodingStats
}

// Restyled 2026-08-18 to match the Claude Design source: each algorithm pick
// is its own small card (same shape as Quiz/JS-Function/UI-Coding's
// TodaysPickCard — static "Algorithm" label instead of a topics-derived one,
// plus a topics line the pick cards don't show) in an auto-fit grid, rather
// than one "Today's Question(s)" card with a header/status pill and a list.
// The design's mockup has no home for the Easy/Medium/Hard solved split, so
// it stays as a compact strip below the grid — real data worth keeping, not
// decorative chrome the design intentionally dropped.
export default function DailyCodingCard({ initialAssignment, stats }: Props) {
  const [assignment, setAssignment] = useState(initialAssignment)
  const [isPending, startTransition] = useTransition()
  const [outcomeFor, setOutcomeFor] = useState<DailyQuestion | null>(null)

  const finishComplete = (id: string, outcome?: Outcome) => {
    setAssignment(prev => prev.map(a => a.id === id ? { ...a, completed: true, outcome: outcome ?? null } : a))
    setOutcomeFor(null)
    startTransition(async () => { await markQuestionComplete(id, outcome ? { outcome } : undefined) })
  }

  return (
    <div className="flex flex-col gap-3.5">
      {assignment.length === 0 ? (
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
          <EmptyState icon={Moon} message="No new questions today — revision day. Browse your history below." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--grid-gap-sm)]">
          {assignment.map(a => (
            <div key={a.id} className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
              <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Algorithm</p>
              <p className={`text-[14px] font-semibold ${a.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>
                {a.question.title} <span className={`text-[11px] font-medium ${DIFFICULTY_COLOR[a.question.difficulty]}`}>{a.question.difficulty}</span>
              </p>
              {a.question.topics && a.question.topics.length > 0 && (
                <p className="text-[12.5px] text-fg-tertiary mt-0.5 truncate">{a.question.topics.join(', ')}</p>
              )}
              <a href={a.question.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between bg-surface-2 border border-border-strong rounded-[8px] px-3 py-[9px] text-[12px] text-fg-primary mt-2.5 hover:border-accent/40 transition-colors">
                <span>Open on {a.question.source}</span>
                <ExternalLink size={12} />
              </a>
              {!a.completed && (
                <button onClick={() => setOutcomeFor(a)} disabled={isPending} className="mt-3 px-3.5 py-2 rounded-[7px] bg-good text-on-good text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
                  Mark Solved
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Easy/Medium/Hard split — Streak/Solved/Completion now live in the
          page-level stats row (CodingView.tsx) instead of duplicating here;
          this breakdown is the one figure that's unique to this card. */}
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-md)] grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">{stats.easySolved}</p>
          <p className="text-xs text-fg-quaternary">Easy</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">{stats.mediumSolved}</p>
          <p className="text-xs text-fg-quaternary">Medium</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-400">{stats.hardSolved}</p>
          <p className="text-xs text-fg-quaternary">Hard</p>
        </div>
      </div>

      {outcomeFor && (
        <OutcomeModal
          title={outcomeFor.question.title}
          onPick={outcome => finishComplete(outcomeFor.id, outcome)}
          onSkip={() => finishComplete(outcomeFor.id)}
          onClose={() => setOutcomeFor(null)}
        />
      )}
    </div>
  )
}
