'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AIStreamRequest } from '@/features/ai/stream-request'

export type AIStreamStatus = 'idle' | 'waiting' | 'streaming' | 'done' | 'stopped' | 'error'
export interface AIStreamResult { text: string; outcome: 'done' | 'stopped' | 'error' }

// How often new text is drawn. Replies arrive in many small chunks, so this
// keeps a long reply from re-rendering the screen for every one of them.
const DRAW_EVERY_MS = 50

// Reads an AI reply from /api/ai/stream as it's written. Put it in the
// smallest component that shows the text, since it re-renders as text arrives.
export function useAIStream() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<AIStreamStatus>('idle')
  const current = useRef<AbortController | null>(null)

  useEffect(() => () => current.current?.abort(), [])

  // A new start replaces any reply still running.
  const start = useCallback(async (body: AIStreamRequest): Promise<AIStreamResult> => {
    current.current?.abort()
    const controller = new AbortController()
    current.current = controller
    const isCurrent = () => current.current === controller
    setText('')
    setStatus('waiting')

    let full = ''
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (outcome: AIStreamResult['outcome']): AIStreamResult => {
      clearTimeout(timer)
      if (isCurrent()) { setText(full); setStatus(outcome) }
      return { text: full, outcome }
    }
    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`)
      const reader = res.body.getReader()
      // stream: true holds back a character split across two chunks (Hindi, ₹).
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        if (!timer && isCurrent()) {
          timer = setTimeout(() => {
            timer = undefined
            if (isCurrent()) { setText(full); setStatus('streaming') }
          }, DRAW_EVERY_MS)
        }
      }
      full += decoder.decode()
      return finish(full.trim() ? 'done' : 'error')
    } catch {
      return finish(controller.signal.aborted ? 'stopped' : 'error')
    }
  }, [])

  const stop = useCallback(() => current.current?.abort(), [])

  // Drops the reply on screen, and stops it if it's still running.
  const reset = useCallback(() => {
    current.current?.abort()
    current.current = null
    setText('')
    setStatus('idle')
  }, [])

  return { text, status, active: status === 'waiting' || status === 'streaming', start, stop, reset }
}
