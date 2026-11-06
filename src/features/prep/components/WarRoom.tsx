'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Pause, Pencil, Play, Timer, X } from 'lucide-react'
import Card from '@/components/Card'
import { FINISH_SHARE, coachLine, focusSeconds, focusedLabel, isGoodDay, minutesLeftLabel, msToNextMinute, nowBlock, paceLabel, paceStatus, type DayPace, type FocusSession } from '../war'
import type { PrepBlock } from '../types'

// The clock for a running session: re-renders only when the minutes shown
// change, and not at all while the tab is hidden (it catches up on return).
function useFocusClock(focus: FocusSession | null) {
  const [now, setNow] = useState(() => Date.now())
  const running = !!focus && !focus.paused_at
  const plannedSeconds = (focus?.planned_minutes ?? 0) * 60
  const startedAt = focus?.started_at
  const pausedSeconds = focus?.paused_seconds
  useEffect(() => {
    if (!running || !startedAt) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      clearTimeout(timer)
      if (document.hidden) return
      const at = Date.now()
      setNow(at)
      const elapsed = Math.round((at - new Date(startedAt).getTime()) / 1000) - (pausedSeconds ?? 0)
      timer = setTimeout(tick, msToNextMinute(plannedSeconds - elapsed))
    }
    timer = setTimeout(tick, 0)
    document.addEventListener('visibilitychange', tick)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', tick) }
  }, [running, startedAt, pausedSeconds, plannedSeconds])
  return now
}

// The navbar slot the timer renders into (TopNav), once the page is mounted.
function useNavSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setSlot(document.getElementById(FOCUS_NAV_SLOT)), 0)
    return () => clearTimeout(t)
  }, [])
  return slot
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
          <p className="text-[13px] font-bold text-fg-primary">Today <span className="font-normal text-fg-tertiary tabular-nums">· {windowLabel}{interviewAt ? ` · 🎤 ${interviewAt}` : ''}</span></p>
          <p className={`text-[12.5px] mt-1 ${isGoodDay(blocks) ? 'text-good' : 'text-fg-secondary'}`}>{coachLine(pace, nowBlock(blocks), isGoodDay(blocks))}</p>
          <p className="text-[11.5px] text-fg-tertiary mt-0.5 tabular-nums"><span className={`font-semibold ${status === 'behind' ? 'text-risk' : status === 'ahead' ? 'text-good' : 'text-fg-secondary'}`}>{paceLabel(pace)}</span> · {pace.donePct}% of plan done · {pace.dayPct}% of the day gone · blocks {pace.blocksDone}/{pace.blocksTotal}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={onInterview} className={HEADER_BTN}>🎤 {interviewAt ? 'Interviews' : 'Interview today'}</button>
          <button onClick={onEditToday} className={HEADER_BTN}><Pencil size={11} /> Edit today</button>
          <button onClick={onEditDefault} className={HEADER_BTN}><Pencil size={11} /> Default plan</button>
        </div>
      </div>
    </Card>
  )
}

// ---------------- Focus bar ----------------

export const FOCUS_NAV_SLOT = 'focus-timer-slot'

// The whole focus timer, in the navbar (no separate screen), in minutes.
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
  // `win`: what a question block's session added (FocusWin in PrepView).
  ended: { label: string; seconds: number; win?: string } | null
  onPause: (f: FocusSession) => void
  onFinish: (f: FocusSession) => void
  onStop: (f: FocusSession) => void
  onGo: () => void
}) {
  const now = useFocusClock(focus)
  const slot = useNavSlot()
  const busy = !!focus?.id.startsWith('tmp-')
  const shell = 'h-[30px] max-w-full rounded-full text-[12px] font-semibold tabular-nums whitespace-nowrap'
  if (!slot) return null
  if (!focus) {
    if (!ended) return null
    return createPortal(
      <div role="status" title={ended.win} className={`${shell} bg-good text-on-good px-3 flex items-center gap-1.5 min-w-0`}>
        <Check size={13} strokeWidth={3} className="shrink-0" />
        <span className="hidden sm:inline truncate">{ended.label} done · </span>
        <span className="shrink-0">{focusedLabel(ended.seconds)}</span>
        {ended.win && <span className="hidden xl:inline font-medium opacity-90 truncate">· {ended.win}</span>}
      </div>,
      slot,
    )
  }
  const left = focus.planned_minutes * 60 - focusSeconds(focus, now)
  const paused = !!focus.paused_at
  // On a phone only the minutes show ("18m"), so the buttons keep their room.
  const [minutes, state] = minutesLeftLabel(left).split(' ')
  const icon = 'w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full inline-flex items-center justify-center hover:bg-white/20 disabled:opacity-50 shrink-0'
  return createPortal(
    <div role="timer" aria-label="Focus session" className={`${shell} ${left < 0 ? 'bg-risk' : 'bg-accent'} ${paused ? 'opacity-75' : ''} text-white pl-2.5 pr-1 flex items-center gap-0.5 min-w-0`}>
      <button onClick={onGo} title={`Go to the work: ${focus.label}${paused ? ' (paused)' : ''}`} aria-label={`${focus.label}, ${paused ? 'paused, ' : ''}${minutes} ${state}`} className="inline-flex items-center gap-1.5 min-w-0">
        <Timer size={13} className="shrink-0 hidden sm:inline" />
        <span className="hidden lg:inline truncate max-w-[200px]">{focus.label}</span>
        {progress && <span className="hidden xl:inline font-normal opacity-85 shrink-0">· {progress}</span>}
        <span className="shrink-0"><span className="hidden lg:inline">· </span>{paused && <span className="hidden sm:inline">paused · </span>}{minutes}<span className="hidden sm:inline"> {state}</span></span>
      </button>
      <span className="hidden sm:block w-px h-4 bg-white/30 mx-1 shrink-0" aria-hidden />
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
    </div>,
    slot,
  )
}
