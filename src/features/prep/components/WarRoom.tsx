'use client'

import { useEffect, useState } from 'react'
import { Check, Pause, Pencil, Play, Timer, X } from 'lucide-react'
import Card from '@/components/Card'
import { FINISH_SHARE, coachLine, isGoodDay, focusSeconds, nowBlock, paceLabel, paceStatus, type DayPace, type FocusSession } from '../war'
import type { PrepBlock } from '../types'

const mmss = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

// ---------------- Header ----------------

const HEADER_BTN = 'inline-flex items-center gap-1 text-[11.5px] font-semibold rounded-[7px] border border-border-strong px-2 py-[3px] text-fg-secondary hover:text-accent hover:border-accent'

// Today: the window, the coach line and pace, and the three ways to change
// the day — nothing here saves on its own; each opens an editor with Save.
export function TodayHeader({ windowLabel, interviewAt, pace, blocks, onInterview, onEditToday, onEditDefault }: {
  windowLabel: string
  interviewAt: string | null
  pace: DayPace
  // Today's plan — the coach line names the next block.
  blocks: PrepBlock[]
  onInterview: () => void
  onEditToday: () => void
  onEditDefault: () => void
}) {
  const status = paceStatus(pace)
  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-fg-primary">Today <span className="font-normal text-fg-tertiary tabular-nums">· {windowLabel}{interviewAt ? ` · 🎤 interview ${interviewAt}` : ''}</span></p>
          <p className={`text-[12.5px] mt-1 ${isGoodDay(blocks) ? 'text-good' : 'text-fg-secondary'}`}>{coachLine(pace, nowBlock(blocks), isGoodDay(blocks))}</p>
          <p className="text-[11.5px] text-fg-tertiary mt-0.5 tabular-nums"><span className={`font-semibold ${status === 'behind' ? 'text-risk' : status === 'ahead' ? 'text-good' : 'text-fg-secondary'}`}>{paceLabel(pace)}</span> · {pace.donePct}% of plan done · {pace.dayPct}% of the day gone · blocks {pace.blocksDone}/{pace.blocksTotal}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={onInterview} className={HEADER_BTN}>🎤 {interviewAt ? 'Interview' : 'Interview today'}</button>
          <button onClick={onEditToday} className={HEADER_BTN}><Pencil size={11} /> Edit today</button>
          <button onClick={onEditDefault} className={HEADER_BTN}><Pencil size={11} /> Default plan</button>
        </div>
      </div>
    </Card>
  )
}

// ---------------- Focus bar ----------------

// The whole focus timer: a floating bar over the page (no separate screen).
// Label = jump to the work; question blocks show today's progress. After a
// session ends on its own (quota met), `ended` shows the result briefly.
// Pure UI: the page applies each action optimistically (PrepView), so the
// buttons respond at once; they wait only while a just-started session is
// still being saved (its id is local).
export function FocusBar({ focus, progress, canFinish, ended, onPause, onFinish, onStop, onGo }: {
  focus: FocusSession | null
  progress: string | null
  // A question block can be finished from FINISH_SHARE of its minutes.
  canFinish: boolean
  ended: { label: string; seconds: number } | null
  onPause: (f: FocusSession) => void
  onFinish: (f: FocusSession) => void
  onStop: (f: FocusSession) => void
  onGo: () => void
}) {
  const now = useNow(!!focus && !focus.paused_at)
  const busy = !!focus?.id.startsWith('tmp-')
  const shell = 'fixed bottom-[86px] md:bottom-7 left-1/2 -translate-x-1/2 z-[30] max-w-[calc(100vw-24px)] rounded-full shadow-[0_8px_24px_var(--shadow-lg)] text-[12.5px] font-semibold tabular-nums'
  if (!focus) {
    if (!ended) return null
    return <div role="status" className={`${shell} bg-good text-on-good px-4 py-2 inline-flex items-center gap-1.5 whitespace-nowrap`}><Check size={14} strokeWidth={3} /> {ended.label} done · {mmss(ended.seconds)} focused</div>
  }
  const left = focus.planned_minutes * 60 - focusSeconds(focus, now)
  const paused = !!focus.paused_at
  const icon = 'w-[28px] h-[28px] rounded-full inline-flex items-center justify-center hover:bg-white/20 disabled:opacity-50 shrink-0'
  return (
    <div role="timer" aria-label="Focus session" className={`${shell} ${left < 0 ? 'bg-risk' : 'bg-accent'} ${paused ? 'opacity-75' : ''} text-white pl-3 pr-1 py-1 flex items-center gap-1`}>
      <button onClick={onGo} title="Go to the work" className="inline-flex items-center gap-1.5 min-w-0 py-1">
        <Timer size={14} className="shrink-0" />
        <span className="truncate">{focus.label}</span>
        {progress && <span className="font-normal opacity-85 shrink-0">· {progress}</span>}
        <span className="shrink-0">· {mmss(left)}</span>
        {paused && <span className="font-normal opacity-85 shrink-0">· paused</span>}
      </button>
      <span className="w-px h-4 bg-white/30 mx-1 shrink-0" aria-hidden />
      <button disabled={busy} onClick={() => onPause(focus)} title={paused ? 'Resume' : 'Pause'} aria-label={paused ? 'Resume' : 'Pause'} className={icon}>
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
      {/* Question blocks also finish themselves at their minutes; Finish opens at FINISH_SHARE. */}
      <button disabled={busy || !canFinish} onClick={() => onFinish(focus)}
        title={canFinish ? 'Finish block' : `Finish opens at ${Math.round(FINISH_SHARE * 100)}% of the block's minutes`} aria-label="Finish block" className={icon}>
        <Check size={14} strokeWidth={3} />
      </button>
      <button disabled={busy} onClick={() => onStop(focus)} title="Stop without finishing" aria-label="Stop without finishing" className={icon}>
        <X size={14} />
      </button>
    </div>
  )
}
