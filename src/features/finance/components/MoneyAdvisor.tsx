'use client'

import { useRef, useState } from 'react'
import AIStreamControls from '@/components/AIStreamControls'
import { useAIStream } from '@/lib/use-ai-stream'
import type { FinancialContext } from '@/features/ai/finance-prompt'

const QUICK_QUESTIONS = ['How long can I job-hunt on my savings?', 'What should I cut while job hunting?', 'Should I pause SIPs until I land a role?', 'Should I prepay my loan?']

// Its own component so the Finance page doesn't re-render as a reply arrives.
export default function MoneyAdvisor({ context }: { context: FinancialContext }) {
  const [question, setQuestion] = useState('')
  const stream = useAIStream()
  const asked = useRef('')

  const ask = (q: string) => {
    if (!q.trim() || stream.active) return
    asked.current = q
    stream.start({ feature: 'finance', question: q, context })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap text-xs text-fg-tertiary">
        {QUICK_QUESTIONS.map(q => (
          <button key={q} onClick={() => setQuestion(q)} className="px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-fg-secondary transition-colors">{q}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask(question)}
          placeholder="Ask about your finances..."
          disabled={stream.active}
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
        />
        <button onClick={() => ask(question)} disabled={stream.active || !question.trim()} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
          {stream.active ? '...' : 'Ask'}
        </button>
      </div>
      {stream.status === 'waiting' && (
        <div className="space-y-2">
          {[90, 75, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      )}
      {stream.text && <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-3">{stream.text}</p>}
      <AIStreamControls status={stream.status} hasText={!!stream.text} onStop={stream.stop} onRetry={() => ask(asked.current)} />
    </div>
  )
}
