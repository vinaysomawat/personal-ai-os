'use client'

import Modal from '@/components/Modal'
import type { Outcome } from '../daily-core'

const OPTIONS: { value: Outcome; emoji: string; label: string }[] = [
  { value: 'solved', emoji: '✅', label: 'Solved cleanly' },
  { value: 'solved_with_help', emoji: '🤝', label: 'Needed help' },
  { value: 'struggled', emoji: '😓', label: 'Struggled' },
]

// Shared by DailyCodingCard and QuestionHistory's completion flows — a
// single click captures the self-reported outcome (the only "accuracy"
// signal possible for open-ended, non-auto-graded problems).
// "Skip" preserves the old one-click-complete behavior for anyone who
// doesn't want to bother — outcome just stays null.
export default function OutcomeModal({ title, onPick, onSkip, onClose }: {
  title: string
  onPick: (outcome: Outcome) => void
  onSkip: () => void
  onClose: () => void
}) {
  return (
    <Modal title="How did it go?" onClose={onClose}>
      <p className="text-sm text-fg-secondary mb-4 truncate">{title}</p>
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map(o => (
          <button key={o.value} onClick={() => onPick(o.value)}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-[10px] bg-surface-2 border border-surface-3 text-[13.5px] text-fg-primary hover:border-accent/40 hover:bg-surface-3 transition-colors text-left">
            <span className="text-base">{o.emoji}</span> {o.label}
          </button>
        ))}
        <button onClick={onSkip} className="w-full py-2 text-xs text-fg-quaternary hover:text-fg-secondary transition-colors">
          Skip
        </button>
      </div>
    </Modal>
  )
}
