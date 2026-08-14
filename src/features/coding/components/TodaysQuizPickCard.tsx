'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, HelpCircle } from 'lucide-react'
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

// Replaces the old hand-authored MCQ "Today's Quiz" (todays-quiz.ts,
// coding_quiz_attempts — retired, not deleted, per this app's own precedent
// for deprecated tables) with a real daily question from the same category
// pool DailyCodingCard already renders — link-out + self-report, same
// interaction algorithm questions use, not an in-app graded quiz anymore.
export default function TodaysQuizPickCard({ pick }: { pick: DailyQuestion | null }) {
  const [item, setItem] = useState(pick)
  const [isPending, startTransition] = useTransition()
  const [showOutcome, setShowOutcome] = useState(false)

  if (!item) {
    return (
      <Card title="Today's Quiz">
        <EmptyState icon={HelpCircle} message="No quiz question available yet — the practice pool hasn't been crawled." />
      </Card>
    )
  }

  const finishComplete = (outcome?: Outcome) => {
    setItem(prev => prev ? { ...prev, completed: true, outcome: outcome ?? null } : prev)
    setShowOutcome(false)
    startTransition(async () => { await markQuestionComplete(item.id, outcome ? { outcome } : undefined) })
  }

  return (
    <Card title="Today's Quiz" action={
      <span className={`text-[11px] font-bold px-2.5 py-[3px] rounded-[6px] ${item.completed ? 'bg-good-soft text-good' : 'bg-warn-soft text-warn'}`}>
        {item.completed ? 'Answered' : 'Pending'}
      </span>
    }>
      <div className="flex items-center gap-1.5 flex-wrap">
        <p className={`text-[14px] font-semibold ${item.completed ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{item.question.title}</p>
        <span className={`text-[11px] font-medium ${DIFFICULTY_COLOR[item.question.difficulty]}`}>{item.question.difficulty}</span>
        <a href={item.question.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-fg-tertiary hover:text-accent transition-colors">
          <ExternalLink size={12} />
        </a>
      </div>
      {!item.completed && (
        <button onClick={() => setShowOutcome(true)} disabled={isPending}
          className="mt-3 px-3.5 py-2 rounded-[7px] bg-good text-on-good text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
          Mark Answered
        </button>
      )}
      {showOutcome && (
        <OutcomeModal
          title={item.question.title}
          onPick={outcome => finishComplete(outcome)}
          onSkip={() => finishComplete()}
          onClose={() => setShowOutcome(false)}
        />
      )}
    </Card>
  )
}
