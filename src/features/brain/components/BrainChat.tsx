'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { askBrain } from '../advisor'
import type { BrainMessage } from '../prompts'
import type { BrainContext } from '../types'

const QUICK_PROMPTS = [
  'What should I do today?',
  'What am I ignoring?',
  'How am I doing overall?',
  'What should I study tonight?',
]

export default function BrainChat({ context }: { context: BrainContext }) {
  const [messages, setMessages] = useState<BrainMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (question: string) => {
    if (!question.trim() || loading) return
    const history = messages
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setInput('')
    setLoading(true)
    try {
      const answer = await askBrain(question, context, history)
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(q => (
            <button key={q} onClick={() => send(q)} className="text-xs text-fg-quaternary px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-fg-secondary transition-colors">{q}</button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div className={`inline-block text-sm rounded-lg px-3 py-2 max-w-[90%] text-left whitespace-pre-wrap ${m.role === 'user' ? 'bg-accent/15 text-fg-primary' : 'bg-surface-2 text-fg-secondary'}`}>
                {m.role !== 'user' && (
                  <div className="flex items-center gap-1 text-[9.5px] font-bold text-accent-strong uppercase tracking-[0.4px] mb-[5px]">
                    <span>◆</span>Brain
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="space-y-2">
              {[85, 70, 90].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          disabled={loading}
          placeholder="Ask your Brain anything..."
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Send" className="px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:opacity-40 transition-colors">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
