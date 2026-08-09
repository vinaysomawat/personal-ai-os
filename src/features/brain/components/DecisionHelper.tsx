'use client'

import { useState } from 'react'
import { askBrainDecision } from '../advisor'
import DecisionCard from './DecisionCard'
import type { BrainContext, Decision } from '../types'

const QUICK_DECISIONS = [
  'Should I switch jobs?',
  'Can I afford a car?',
  'Should I stop my SIP?',
]

export default function DecisionHelper({ context }: { context: BrainContext }) {
  const [question, setQuestion] = useState('')
  const [askedQuestion, setAskedQuestion] = useState('')
  const [decision, setDecision] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(false)

  const ask = async (q: string) => {
    if (!q.trim() || loading) return
    setLoading(true)
    setDecision(null)
    setAskedQuestion(q)
    try {
      const result = await askBrainDecision(q, context)
      setDecision(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {!decision && !loading && (
        <div className="flex flex-wrap gap-2">
          {QUICK_DECISIONS.map(q => (
            <button key={q} onClick={() => ask(q)} className="text-xs text-fg-quaternary px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-fg-secondary transition-colors">{q}</button>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[85, 70, 90, 60].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      )}

      {decision && !loading && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[12.5px] text-fg-tertiary">&quot;{askedQuestion}&quot;</p>
          <DecisionCard decision={decision} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          disabled={loading}
          placeholder="Should I...?"
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
        />
        <button onClick={() => ask(question)} disabled={loading || !question.trim()} className="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-40 transition-colors">
          Ask
        </button>
      </div>
    </div>
  )
}
