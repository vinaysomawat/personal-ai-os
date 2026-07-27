'use client'

import { X } from 'lucide-react'
import type { Outcome } from '../daily-core'

const OPTIONS: { value: Outcome; emoji: string; label: string }[] = [
  { value: 'solved', emoji: '✅', label: 'Solved cleanly' },
  { value: 'solved_with_help', emoji: '🤝', label: 'Needed help' },
  { value: 'struggled', emoji: '😓', label: 'Struggled' },
]

// Shared by DailyCodingCard and QuestionHistory's completion flows — a
// single click captures the self-reported outcome (the only "accuracy"
// signal possible for open-ended, non-auto-graded problems), same low-
// friction pattern as Learning's duration-picker for study sessions.
// "Skip" preserves the old one-click-complete behavior for anyone who
// doesn't want to bother — outcome just stays null.
export default function OutcomeModal({ title, onPick, onSkip, onClose }: {
  title: string
  onPick: (outcome: Outcome) => void
  onSkip: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-fg-primary">How did it go?</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-secondary"><X size={16} /></button>
        </div>
        <p className="text-sm text-fg-secondary mb-4 truncate">{title}</p>
        <div className="space-y-2">
          {OPTIONS.map(o => (
            <button key={o.value} onClick={() => onPick(o.value)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface-2 border border-surface-3 text-sm text-fg-primary hover:border-accent/40 hover:bg-surface-3 transition-colors text-left">
              <span className="text-base">{o.emoji}</span> {o.label}
            </button>
          ))}
          <button onClick={onSkip} className="w-full py-2 text-xs text-fg-quaternary hover:text-fg-secondary transition-colors">
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
