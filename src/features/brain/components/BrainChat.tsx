'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import AIStreamControls from '@/components/AIStreamControls'
import { useAIStream } from '@/lib/use-ai-stream'
import type { BrainMessage } from '../prompts'
import type { BrainContext } from '../types'

const QUICK_PROMPTS = [
  'What should I do today?',
  'What am I ignoring?',
  'How am I doing overall?',
  'What should I study tonight?',
]

function Bubble({ role, children }: { role: BrainMessage['role']; children: React.ReactNode }) {
  return (
    <div className={role === 'user' ? 'text-right' : ''}>
      <div className={`inline-block text-sm rounded-lg px-3 py-2 max-w-[90%] text-left whitespace-pre-wrap ${role === 'user' ? 'bg-accent/15 text-fg-primary' : 'bg-surface-2 text-fg-secondary'}`}>
        {role !== 'user' && (
          <div className="flex items-center gap-1 text-[9.5px] font-bold text-accent-strong uppercase tracking-[0.4px] mb-[5px]">
            <span>◆</span>Brain
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default function BrainChat({ context }: { context: BrainContext }) {
  const [messages, setMessages] = useState<BrainMessage[]>([])
  const [input, setInput] = useState('')
  // The question to ask again when a reply was stopped with nothing or failed.
  const [retryable, setRetryable] = useState<string | null>(null)
  const stream = useAIStream()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: stream.active ? 'auto' : 'smooth' }) }, [messages, stream.text, stream.active])

  // `history` holds the messages before this question, so a retry doesn't
  // send the question twice.
  const ask = async (question: string, history: BrainMessage[]) => {
    setRetryable(question)
    const { text, outcome } = await stream.start({ feature: 'brain', question, context, history })
    // A failed reply stays in the stream's bubble until it's retried; it
    // isn't added to the conversation the next question sends.
    if (outcome === 'error') return
    if (text.trim()) {
      setMessages(prev => [...prev, { role: 'assistant', content: text }])
      setRetryable(null)
      stream.reset()
    }
  }

  const send = (question: string) => {
    if (!question.trim() || stream.active) return
    const history = retryable ? messages.slice(0, -1) : messages
    setMessages([...history, { role: 'user', content: question }])
    setInput('')
    ask(question, history)
  }

  const retry = () => {
    if (retryable) ask(retryable, messages.slice(0, -1))
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
          {messages.map((m, i) => <Bubble key={i} role={m.role}>{m.content}</Bubble>)}
          {stream.text && <Bubble role="assistant">{stream.text}</Bubble>}
          {stream.status === 'waiting' && (
            <div className="space-y-2">
              {[85, 70, 90].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
            </div>
          )}
          <AIStreamControls status={stream.status} hasText={!!stream.text} onStop={stream.stop} onRetry={retry} />
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          disabled={stream.active}
          placeholder="Ask your Brain anything..."
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
        />
        <button onClick={() => send(input)} disabled={stream.active || !input.trim()} aria-label="Send" className="px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:opacity-40 transition-colors">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
