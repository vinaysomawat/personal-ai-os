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

export default function DailyCodingCard({ initialAssignment, stats }: Props) {
  const [assignment, setAssignment] = useState(initialAssignment)
  const [isPending, startTransition] = useTransition()
  const [outcomeFor, setOutcomeFor] = useState<DailyQuestion | null>(null)

  const finishComplete = (id: string, outcome?: Outcome) => {
    setAssignment(prev => prev.map(a => a.id === id ? { ...a, completed: true, outcome: outcome ?? null } : a))
    setOutcomeFor(null)
    startTransition(async () => { await markQuestionComplete(id, outcome ? { outcome } : undefined) })
  }

  const allCompleted = assignment.length > 0 && assignment.every(a => a.completed)

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
      <div className="flex items-center justify-between gap-2.5 mb-2.5">
        <h2 className="text-[13px] font-bold text-fg-primary whitespace-nowrap">Today&apos;s Question{assignment.length > 1 ? 's' : ''}</h2>
        {assignment.length > 0 && (
          <span className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[6px] whitespace-nowrap ${allCompleted ? 'bg-good-soft text-good' : 'bg-warn-soft text-warn'}`}>
            {allCompleted ? 'Solved' : 'Pending'}
          </span>
        )}
      </div>

      {assignment.length === 0 ? (
        <EmptyState icon={Moon} message="No new questions today — revision day. Browse your history below." />
      ) : (
        <ul className="flex flex-col gap-2">
          {assignment.map(a => (
            <li key={a.id}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={`text-[14px] font-semibold ${a.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{a.question.title}</p>
                <span className={`text-[11px] font-medium ${DIFFICULTY_COLOR[a.question.difficulty]}`}>{a.question.difficulty}</span>
                <a href={a.question.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-fg-tertiary hover:text-accent transition-colors">
                  <ExternalLink size={12} />
                </a>
              </div>
              {a.question.topics && a.question.topics.length > 0 && (
                <p className="text-[12.5px] text-fg-tertiary mt-0.5 truncate">Topics: {a.question.topics.join(', ')}</p>
              )}
              {!a.completed && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setOutcomeFor(a)} disabled={isPending} className="px-3.5 py-2 rounded-[7px] bg-good text-on-good text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
                    Mark Solved
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Easy/Medium/Hard split — Streak/Solved/Completion now live in the
          page-level stats row (CodingView.tsx) instead of duplicating here;
          this breakdown is the one figure that's unique to this card. */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-surface-3">
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
