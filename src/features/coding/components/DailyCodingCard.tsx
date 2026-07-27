'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, ExternalLink, Moon } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { markQuestionComplete } from '../daily'
import OutcomeModal from './OutcomeModal'
import type { DailyQuestion, CodingStats, Outcome } from '../daily-core'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400 bg-good-soft',
  medium: 'text-amber-400 bg-warn-soft',
  hard: 'text-red-400 bg-risk-soft',
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

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wider mb-4">Today&apos;s Coding Challenge</h2>

      {assignment.length === 0 ? (
        <EmptyState icon={Moon} message="No new questions today — revision day. Browse your history below." />
      ) : (
        <ul className="space-y-2">
          {assignment.map(a => (
            <li key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border ${a.completed ? 'bg-surface-2/50 border-surface-3' : 'bg-surface-2 border-surface-3'}`}>
              <button onClick={() => !a.completed && setOutcomeFor(a)} disabled={a.completed || isPending} aria-label="Mark question complete" className="p-1.5 -m-1.5 shrink-0">
                {a.completed ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-fg-quaternary hover:text-accent transition-colors" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${a.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{a.question.title}</p>
                {a.question.topics && a.question.topics.length > 0 && (
                  <p className="text-xs text-fg-tertiary mt-0.5 truncate">Topics: {a.question.topics.join(', ')}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${a.completed ? 'text-green-400 bg-good-soft' : 'text-fg-tertiary bg-surface-3'}`}>
                {a.completed ? 'Solved' : 'Pending'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${DIFFICULTY_COLOR[a.question.difficulty]}`}>{a.question.difficulty}</span>
              <a href={a.question.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-fg-tertiary hover:text-accent transition-colors">
                <ExternalLink size={14} />
              </a>
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
