'use client'

import { RotateCcw, Square } from 'lucide-react'
import type { AIStreamStatus } from '@/lib/use-ai-stream'

const BUTTON = 'inline-flex items-center gap-1 font-semibold text-accent hover:underline'

// Under a reply being streamed: Stop while it runs, then Retry if it was
// stopped or failed. Nothing once it finished normally.
export default function AIStreamControls({ status, hasText, onStop, onRetry }: {
  status: AIStreamStatus
  hasText: boolean
  onStop: () => void
  onRetry: () => void
}) {
  if (status === 'waiting' || status === 'streaming') {
    return <button onClick={onStop} className={`${BUTTON} text-[11.5px] mt-1.5`}><Square size={10} fill="currentColor" /> Stop</button>
  }
  if (status !== 'stopped' && status !== 'error') return null
  return (
    <p role={status === 'error' ? 'alert' : undefined} className="text-[11.5px] text-fg-tertiary mt-1.5">
      {status === 'stopped' ? 'Stopped' : hasText ? 'The reply was cut off' : "Couldn't get a reply"} · <button onClick={onRetry} className={BUTTON}><RotateCcw size={10} /> Retry</button>
    </p>
  )
}
