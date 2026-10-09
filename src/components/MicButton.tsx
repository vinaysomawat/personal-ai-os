'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { speechStats } from '@/lib/speech-stats'

// Voice mode: tap to record, tap to stop; the recording is transcribed by
// Groq Whisper (/api/transcribe) and handed to onText. Nothing is stored —
// the caller appends the text to its own answer box.
const MAX_SECONDS = 300

type Status = 'idle' | 'recording' | 'transcribing'

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t))
}

export function useDictation(onText: (text: string) => void) {
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<{ seconds: number; fillers: number } | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(0)
  const onTextRef = useRef(onText)
  // False once unmounted (e.g. the question changed) — a pending recording
  // is then dropped instead of landing in the wrong answer.
  const alive = useRef(true)
  onTextRef.current = onText

  const stopTimer = () => { if (timer.current) clearInterval(timer.current); timer.current = null }

  useEffect(() => { alive.current = true; return () => {
    alive.current = false
    stopTimer()
    if (recorder.current?.state === 'recording') recorder.current.stop()
    recorder.current?.stream.getTracks().forEach(t => t.stop())
  } }, [])

  async function start() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice input isn’t supported in this browser')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone permission denied')
      return
    }
    const mimeType = pickMimeType()
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = async () => {
      stopTimer()
      stream.getTracks().forEach(t => t.stop())
      const seconds = Math.round((Date.now() - startedAt.current) / 1000)
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' })
      if (!alive.current) return
      if (blob.size === 0) { setStatus('idle'); return }
      setStatus('transcribing')
      try {
        const body = new FormData()
        body.append('audio', blob)
        const res = await fetch('/api/transcribe', { method: 'POST', body })
        const json = await res.json() as { text?: string; error?: string }
        if (!res.ok || json.error) throw new Error(json.error ?? 'Transcription failed')
        const text = (json.text ?? '').trim()
        if (!alive.current) return
        if (text) {
          onTextRef.current(text)
          setLast({ seconds, fillers: speechStats(text).fillers })
        } else {
          setError('Didn’t catch anything — try again')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed')
      } finally {
        if (alive.current) setStatus('idle')
      }
    }
    recorder.current = rec
    startedAt.current = Date.now()
    setElapsed(0)
    setLast(null)
    rec.start()
    setStatus('recording')
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - startedAt.current) / 1000)
      setElapsed(s)
      if (s >= MAX_SECONDS && rec.state === 'recording') rec.stop()
    }, 250)
  }

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  return { status, elapsed, error, last, start, stop }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Appends each transcript to the caller's text (with a space).
export default function MicButton({ onText, className = '' }: { onText: (text: string) => void; className?: string }) {
  const { status, elapsed, error, last, start, stop } = useDictation(onText)
  const recording = status === 'recording'
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={status === 'transcribing'}
        aria-label={recording ? 'Stop recording' : 'Answer by voice'}
        title={recording ? 'Stop and transcribe' : 'Answer by voice'}
        className={`inline-flex items-center gap-1 rounded-[7px] px-2 py-[5px] text-[11.5px] font-semibold border transition-colors disabled:opacity-60 ${
          recording ? 'bg-risk-soft border-risk-border text-risk' : 'bg-surface-2 border-surface-3 text-fg-secondary hover:text-accent hover:border-accent'
        }`}
      >
        {recording ? <Square size={11} className="fill-current" /> : <Mic size={12} />}
        {recording ? 'Stop' : status === 'transcribing' ? 'Transcribing…' : 'Speak'}
      </button>
      {recording && (
        <span className="inline-flex items-center gap-1 text-[11px] text-risk tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-risk animate-pulse" />{mmss(elapsed)}
        </span>
      )}
      {!recording && error && <span className="text-[11px] text-risk truncate">{error}</span>}
      {!recording && !error && last && status === 'idle' && (
        <span className="text-[11px] text-fg-tertiary tabular-nums truncate">{mmss(last.seconds)} spoken · {last.fillers} filler{last.fillers === 1 ? '' : 's'}</span>
      )}
    </span>
  )
}

export const appendText = (prev: string, text: string) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text)
