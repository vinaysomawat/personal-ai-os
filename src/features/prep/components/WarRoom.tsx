'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pause, Play, Timer, X } from 'lucide-react'
import Card from '@/components/Card'
import { endFocusSession, savePrepRestDay, savePrepWindow, savePrepSettings, toggleFocusSessionPause } from '../actions'
import { LEVELS, WEEKDAYS, levelOf } from '../hunt'
import { FINISH_SHARE, dayWindow, coachLine, isGoodDay, focusSeconds, hm, nowBlock, paceLabel, paceStatus, readinessTier, type DayPace, type FocusSession, type WarReadiness } from '../war'
import type { PrepBlock, PrepSession, PrepSettings } from '../types'
import { guard } from '@/lib/guard'

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

const TIME_INPUT = 'bg-surface-2 border border-border-strong rounded-[6px] px-1 py-[2px] text-[11.5px] text-fg-secondary outline-none focus:border-accent w-[88px]'
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const fromHHMM = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m }

export function WarHeader({ war, settings, questionMinutes, pace, blocks, restDay }: {
  war: WarReadiness; settings: PrepSettings; questionMinutes: number; pace: DayPace
  // Today's plan — the coach line names the next block.
  blocks: PrepBlock[]
  // Today is the weekly rest day (no plan).
  restDay: boolean
}) {
  const status = paceStatus(pace)
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const level = levelOf(settings.hours_per_day)
  // A new level rebuilds today's plan.
  const save = (hours: number) => startSave(guard(async () => { await savePrepSettings(hours); router.refresh() }))
  // A new rest day rebuilds today's plan too.
  const saveRest = (day: number) => startSave(guard(async () => { await savePrepRestDay(day); router.refresh() }))
  const saveWindow = (start: number, end: number) => startSave(guard(async () => { await savePrepWindow(start, end); router.refresh() }))
  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="text-[13px] font-bold text-fg-primary">🔥 Interview War Mode</p>
            <div role="radiogroup" aria-label="Daily load" className={`inline-flex rounded-[8px] border border-border-strong overflow-hidden ${saving ? 'opacity-60' : ''}`}>
              {LEVELS.map(l => (
                <button key={l.key} role="radio" aria-checked={level.key === l.key} disabled={saving} onClick={() => level.key !== l.key && save(l.hours)}
                  className={`text-[11.5px] px-2 py-[3px] tabular-nums border-l first:border-l-0 border-border-strong ${level.key === l.key ? 'bg-accent text-white font-semibold' : 'text-fg-secondary hover:bg-surface-2'}`}>
                  {l.label} <span className={level.key === l.key ? 'opacity-80' : 'text-fg-tertiary'}>{l.hours}h</span>
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-1 text-[11px] text-fg-tertiary">
              Rest
              <select value={settings.rest_day} disabled={saving} onChange={e => saveRest(Number(e.target.value))} aria-label="Weekly rest day"
                className="bg-surface-2 border border-border-strong rounded-[6px] px-1 py-[2px] text-[11.5px] text-fg-secondary outline-none focus:border-accent">
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
            {/* The day window: pace and the timeline (an end before the start runs past midnight). */}
            <span className="inline-flex items-center gap-1 text-[11px] text-fg-tertiary">
              Day
              <input type="time" step={900} value={toHHMM(settings.day_start_min)} disabled={saving} aria-label="Day starts"
                onChange={e => e.target.value && saveWindow(fromHHMM(e.target.value), settings.day_end_min)} className={TIME_INPUT} />
              –
              <input type="time" step={900} value={toHHMM(settings.day_end_min)} disabled={saving} aria-label="Day ends"
                onChange={e => e.target.value && saveWindow(settings.day_start_min, fromHHMM(e.target.value))} className={TIME_INPUT} />
            </span>
            {!restDay && <span className="text-[11px] text-fg-tertiary tabular-nums">{hm(questionMinutes)} of questions/day</span>}
          </div>
          {restDay
            ? <p className="text-[12.5px] mt-1 text-fg-secondary">🌿 Rest day — no plan. Walk, gym, see people. The streak carries over.</p>
            : <p className={`text-[12.5px] mt-1 ${isGoodDay(blocks) ? 'text-good' : 'text-fg-secondary'}`}>{coachLine(pace, nowBlock(blocks), isGoodDay(blocks))}</p>}
          {!restDay && <p className="text-[11.5px] text-fg-tertiary mt-0.5 tabular-nums"><span className={`font-semibold ${status === 'behind' ? 'text-risk' : status === 'ahead' ? 'text-good' : 'text-fg-secondary'}`}>{paceLabel(pace)}</span> · {pace.donePct}% of plan done · {pace.dayPct}% of {dayWindow(settings).label} gone · blocks {pace.blocksDone}/{pace.blocksTotal}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-[22px] font-bold leading-none tabular-nums ${war.ready || war.interviewReady ? 'text-good' : war.overall >= 60 ? 'text-warn' : 'text-risk'}`}>{war.overall}%</p>
          <p className={`text-[11px] font-bold mt-1 ${readinessTier(war).tone === 'good' ? 'text-good' : 'text-risk'}`}>{readinessTier(war).label}</p>
        </div>
      </div>
    </Card>
  )
}

// ---------------- Focus bar ----------------

// The whole focus timer: a floating bar over the page (no separate screen).
// Label = jump to the work; question blocks show today's progress. After a
// session ends on its own (quota met), `ended` shows the result briefly.
export function FocusBar({ focus, progress, canFinish, ended, onChange, onEnded, onGo }: {
  focus: FocusSession | null
  progress: string | null
  // A question block can be finished from FINISH_SHARE of its minutes.
  canFinish: boolean
  ended: { label: string; seconds: number } | null
  onChange: (f: FocusSession) => void
  onEnded: (f: FocusSession | null, session: PrepSession | null) => void
  onGo: () => void
}) {
  const now = useNow(!!focus && !focus.paused_at)
  const [busy, start] = useTransition()
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
      <button disabled={busy} onClick={() => start(guard(async () => { const f = await toggleFocusSessionPause(focus.id); if (f) onChange(f) }))} title={paused ? 'Resume' : 'Pause'} aria-label={paused ? 'Resume' : 'Pause'} className={icon}>
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
      {/* Question blocks also finish themselves at their minutes; Finish opens at FINISH_SHARE. */}
      <button disabled={busy || !canFinish} onClick={() => start(guard(async () => { const r = await endFocusSession(focus.id, true); onEnded(r.focus, r.session) }))}
        title={canFinish ? 'Finish block' : `Finish opens at ${Math.round(FINISH_SHARE * 100)}% of the block's minutes`} aria-label="Finish block" className={icon}>
        <Check size={14} strokeWidth={3} />
      </button>
      <button disabled={busy} onClick={() => start(guard(async () => { const r = await endFocusSession(focus.id, false); onEnded(r.focus, null) }))} title="Stop without finishing" aria-label="Stop without finishing" className={icon}>
        <X size={14} />
      </button>
    </div>
  )
}
