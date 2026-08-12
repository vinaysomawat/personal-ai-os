'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '@/components/Card'
import { saveTodaysQuizAttempt } from '../todays-quiz-actions'
import type { QuizQuestion } from '../todays-quiz'
import type { TodaysQuizAttempt } from '../todays-quiz-actions'

interface Props {
  questions: QuizQuestion[]
  initialAttempt: TodaysQuizAttempt | null
}

// Score tiers match Career's Quiz modal (CareerView.tsx) exactly, for a
// consistent "how good was that score" language across the app.
function scoreColor(pct: number): string {
  return pct >= 80 ? 'var(--good)' : pct >= 60 ? 'var(--accent)' : pct >= 40 ? 'var(--warn)' : 'var(--risk)'
}
function scoreBg(pct: number): string {
  return pct >= 80 ? 'var(--good-soft)' : pct >= 60 ? 'var(--accent-soft)' : pct >= 40 ? 'var(--warn-soft)' : 'var(--risk-soft)'
}

// One-question-at-a-time stepper with a progress bar and a summary screen
// at the end. Picking an option instantly reveals correct/incorrect and
// locks that question; the header's ← → arrows let you freely move between
// questions without answering (an unanswered question just stays unlocked
// when you return to it), while the full-width button only appears once
// the current question is answered and advances/submits from there. The
// attempt is saved once, when the summary is reached.
export default function TodaysQuizCard({ questions, initialAttempt }: Props) {
  const total = questions.length
  const [answers, setAnswers] = useState<Record<string, number>>(initialAttempt?.answers ?? {})
  const [idx, setIdx] = useState(initialAttempt ? total : 0)
  const [savedAttempt, setSavedAttempt] = useState<TodaysQuizAttempt | null>(initialAttempt)
  const [isPending, startTransition] = useTransition()

  if (total === 0) return null

  const isSummary = idx >= total
  const current = !isSummary ? questions[idx] : null
  const currentAnswered = current ? answers[current.id] !== undefined : false

  const pick = (optionIndex: number) => {
    if (!current || currentAnswered) return
    setAnswers(prev => ({ ...prev, [current.id]: optionIndex }))
  }

  const advance = () => {
    const nextIdx = idx + 1
    setIdx(nextIdx)
    if (nextIdx >= total) {
      const questionIds = questions.map(q => q.id)
      startTransition(async () => {
        const { score } = await saveTodaysQuizAttempt(questionIds, answers)
        setSavedAttempt({ questionIds, answers, score, total })
      })
    }
  }

  const goBack = () => {
    if (idx === 0) return
    setIdx(idx - 1)
  }

  const goForward = () => {
    if (idx >= total - 1) return
    setIdx(idx + 1)
  }

  const retake = () => {
    setAnswers({})
    setIdx(0)
    setSavedAttempt(null)
  }

  const percent = savedAttempt ? Math.round((savedAttempt.score / savedAttempt.total) * 100) : 0

  return (
    <Card padding="p-[var(--card-pad-lg)]">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-bold text-fg-primary">Today&apos;s Quiz</h2>
        {isSummary && savedAttempt ? (
          <span className="text-[11px] font-bold rounded-[10px] px-[9px] py-[3px]" style={{ color: scoreColor(percent), background: scoreBg(percent) }}>
            {savedAttempt.score} of {savedAttempt.total} correct
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-fg-tertiary">{idx + 1} of {total}</span>
            <button
              onClick={goBack}
              disabled={idx === 0}
              aria-label="Previous question"
              className="w-5 h-5 flex items-center justify-center rounded-[6px] border border-border-strong text-fg-tertiary hover:bg-surface-2 hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goForward}
              disabled={idx === total - 1}
              aria-label="Next question"
              className="w-5 h-5 flex items-center justify-center rounded-[6px] border border-border-strong text-fg-tertiary hover:bg-surface-2 hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-3.5">
        {questions.map((q, i) => {
          const ans = answers[q.id]
          const bg = ans === undefined
            ? (i === idx && !isSummary ? 'bg-accent' : 'bg-border')
            : (ans === q.correctIndex ? 'bg-good' : 'bg-risk')
          return <div key={q.id} className={`h-1 flex-1 rounded-full ${bg}`} />
        })}
      </div>

      {isSummary ? (
        <>
          <div className="text-center py-1.5">
            <div className="text-[32px] font-bold" style={{ color: scoreColor(percent) }}>{percent}%</div>
            <div className="text-[12.5px] text-fg-tertiary mt-0.5">{savedAttempt?.score ?? 0} of {total} correct</div>
          </div>
          <button
            onClick={retake}
            disabled={isPending}
            className="mt-2.5 w-full bg-accent border-none rounded-[8px] py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            ↻ Retake quiz
          </button>
        </>
      ) : current && (
        <>
          <p className="text-[14px] font-semibold text-fg-primary mb-3">{current.question}</p>
          <div className="flex flex-col gap-2">
            {current.options.map((opt, optIdx) => {
              const isCorrect = optIdx === current.correctIndex
              const isPicked = optIdx === answers[current.id]
              let style = 'border border-border-strong text-fg-secondary hover:bg-surface-2'
              let markStyle = 'border border-border-strong text-fg-tertiary'
              if (currentAnswered) {
                if (isCorrect) { style = 'border border-good bg-good-soft text-good'; markStyle = 'bg-good text-on-good border-good' }
                else if (isPicked) { style = 'border border-risk bg-risk-soft text-risk'; markStyle = 'bg-risk text-white border-risk' }
                else { style = 'border border-border-strong text-fg-quaternary opacity-60'; markStyle = 'border border-border-strong text-fg-quaternary' }
              }
              return (
                <button
                  key={optIdx}
                  onClick={() => pick(optIdx)}
                  disabled={currentAnswered}
                  className={`flex items-center gap-2.5 text-left text-[13px] rounded-[8px] px-3 py-2 transition-colors ${style} ${currentAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className={`shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold ${markStyle}`}>
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              )
            })}
          </div>
          {currentAnswered && (
            <div className="text-[12px] text-fg-secondary bg-surface-2 rounded-[8px] px-3 py-2.5 mt-3">
              {current.explanation}
            </div>
          )}
          {currentAnswered && (
            <button
              onClick={advance}
              disabled={isPending}
              className="mt-3.5 w-full bg-accent border-none rounded-[8px] py-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {idx === total - 1 ? 'See results' : 'Next question'}
            </button>
          )}
        </>
      )}
    </Card>
  )
}
