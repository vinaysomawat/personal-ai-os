'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Moon } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import { markQuestionComplete } from '../daily'
import OutcomeModal from './OutcomeModal'
import type { DailyQuestion, Outcome } from '../daily-core'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-amber-400',
  hard: 'text-red-400',
}

interface Props {
  initialAssignment: DailyQuestion[]
}

// Restyled 2026-08-18 to match the Claude Design source: each algorithm pick
// is its own small card (same shape as Quiz/JS-Function/UI-Coding's
// TodaysPickCard — static "Algorithm" label instead of a topics-derived one,
// plus a topics line the pick cards don't show) in an auto-fit grid, rather
// than one "Today's Question(s)" card with a header/status pill and a list.
// Stacked single-column (2026-08-22) rather than a 2-col sub-grid — this
// card now sits alongside the other 3 daily-pick cards in one row (see
// CodingView.tsx), so its own width is a quarter of the page, too narrow
// for a 2-up sub-grid on a Monday's 2 easy picks.
export default function DailyCodingCard({ initialAssignment }: Props) {
  const [assignment, setAssignment] = useState(initialAssignment)
  const [isPending, startTransition] = useTransition()
  const [outcomeFor, setOutcomeFor] = useState<DailyQuestion | null>(null)

  const finishComplete = (id: string, outcome?: Outcome) => {
    setAssignment(prev => prev.map(a => a.id === id ? { ...a, completed: true, outcome: outcome ?? null } : a))
    setOutcomeFor(null)
    startTransition(async () => { await markQuestionComplete(id, outcome ? { outcome } : undefined) })
  }

  return (
    <>
      <Card title="Today&apos;s Algorithm Question">
        {assignment.length === 0 ? (
          <EmptyState icon={Moon} message="No new questions today — revision day. Browse your history below." />
        ) : (
          <div className="flex-1 flex flex-col gap-[var(--grid-gap-sm)]">
            {assignment.map(a => (
              <div key={a.id} onClick={() => window.open(a.question.url, '_blank', 'noopener,noreferrer')}
                className="flex-1 flex flex-col cursor-pointer">
                <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Algorithm</p>
                <div className="flex items-start gap-1.5">
                  <p className={`text-[14px] font-semibold flex-1 min-w-0 ${a.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>
                    {a.question.title} <span className={`text-[11px] font-medium ${DIFFICULTY_COLOR[a.question.difficulty]}`}>{a.question.difficulty}</span>
                  </p>
                  <a href={a.question.url} target="_blank" rel="noopener noreferrer" aria-label="Open question" onClick={e => e.stopPropagation()}
                    className="shrink-0 text-fg-quaternary hover:text-accent transition-colors mt-0.5">
                    <ExternalLink size={13} />
                  </a>
                </div>
                {a.question.topics && a.question.topics.length > 0 && (
                  <p className="text-[12.5px] text-fg-tertiary mt-0.5 truncate">{a.question.topics.join(', ')}</p>
                )}
                {!a.completed && (
                  <button onClick={e => { e.stopPropagation(); setOutcomeFor(a) }} disabled={isPending} className="mt-auto w-full py-2 rounded-[7px] bg-good text-on-good text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
                    Mark Solved
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {outcomeFor && (
        <OutcomeModal
          title={outcomeFor.question.title}
          onPick={outcome => finishComplete(outcomeFor.id, outcome)}
          onSkip={() => finishComplete(outcomeFor.id)}
          onClose={() => setOutcomeFor(null)}
        />
      )}
    </>
  )
}
