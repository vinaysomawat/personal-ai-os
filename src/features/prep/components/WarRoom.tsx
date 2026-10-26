'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pause, Play, Sparkles, Timer, X } from 'lucide-react'
import Card from '@/components/Card'
import { modalSaveButtonClass } from '@/components/Modal'
import { READINESS_CONFIG, type ReadinessTier } from '../types'
import { endFocusSession, generatePrepForecast, savePrepRestDay, savePrepSettings, toggleFocusSessionPause } from '../actions'
import { LEVELS, WEEKDAYS, levelOf } from '../hunt'
import { FINISH_SHARE, GATES, PACE_WINDOW, blockProgress, coachLine, focusedMinutes, isGoodDay, focusSeconds, hm, nowBlock, paceLabel, paceStatus, readinessTier, type DayPace, type FocusSession, type Forecast, type RevisionItem, type TopicWeakness, type WarReadiness } from '../war'
import type { PrepBlock, PrepSession, PrepSettings, ReadinessCell } from '../types'
import { guard } from '@/lib/guard'

const mmss = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`
const scoreCls = (s: number | null, gate: number) => s === null ? 'text-fg-tertiary' : s >= gate ? 'text-good' : s >= gate - 15 ? 'text-warn' : 'text-risk'

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
            {!restDay && <span className="text-[11px] text-fg-tertiary tabular-nums">{hm(questionMinutes)} of questions/day</span>}
          </div>
          {restDay
            ? <p className="text-[12.5px] mt-1 text-fg-secondary">🌿 Rest day — no plan. Walk, gym, see people. The streak carries over.</p>
            : <p className={`text-[12.5px] mt-1 ${isGoodDay(blocks) ? 'text-good' : 'text-fg-secondary'}`}>{coachLine(pace, nowBlock(blocks), isGoodDay(blocks))}</p>}
          {!restDay && <p className="text-[11.5px] text-fg-tertiary mt-0.5 tabular-nums"><span className={`font-semibold ${status === 'behind' ? 'text-risk' : status === 'ahead' ? 'text-good' : 'text-fg-secondary'}`}>{paceLabel(pace)}</span> · {pace.donePct}% of plan done · {pace.dayPct}% of {PACE_WINDOW.label} gone · blocks {pace.blocksDone}/{pace.blocksTotal}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-[22px] font-bold leading-none tabular-nums ${war.ready || war.interviewReady ? 'text-good' : war.overall >= 60 ? 'text-warn' : 'text-risk'}`}>{war.overall}%</p>
          <p className={`text-[11px] font-bold mt-1 ${readinessTier(war).tone === 'good' ? 'text-good' : 'text-risk'}`}>{readinessTier(war).label}</p>
        </div>
      </div>
    </Card>
  )
}

// ---------------- Mission ----------------

export function MissionCard({ session, focusSessions, doneToday, onStart, onOpen }: {
  session: PrepSession | null
  focusSessions: FocusSession[]
  // Questions practiced today per category (block progress + "N answered").
  doneToday: Record<string, number>
  onStart: (key: string) => void
  onOpen: (href: string) => void
}) {
  if (!session) return <Card title="Today's Mission"><p className="text-[12.5px] text-fg-tertiary">Couldn&apos;t build today&apos;s plan — reload.</p></Card>
  const ctx = { answered: doneToday, focused: focusedMinutes(focusSessions, session.date) }
  if (session.blocks.length === 0) return (
    <Card title="Today's Mission">
      <p className="text-[13px] font-semibold text-fg-primary">🌿 Rest day — nothing planned.</p>
      <p className="text-[12px] text-fg-secondary mt-1">Walk, go to the gym, see people. Rest is part of a 2–4 month search; the plan is back tomorrow and the streak carries over.</p>
    </Card>
  )
  const now = nowBlock(session.blocks)
  const active = focusSessions.find(f => f.status === 'active')
  const done = session.blocks.filter(b => b.done).length
  return (
    <Card title="Today's Mission" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{done}/{session.blocks.length} done · {hm(session.blocks.reduce((s, b) => s + b.minutes, 0))}</span>}>
      {now ? (
        <div className="rounded-[12px] border border-accent bg-accent-soft px-3.5 py-3 mb-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-accent">Do this now</p>
          <div className="flex flex-wrap items-end justify-between gap-2 mt-0.5">
            <div className="min-w-0">
              <p className="text-[17px] font-bold text-fg-primary leading-tight">{now.label} <span className="text-[13px] font-semibold text-fg-tertiary tabular-nums">· {hm(now.minutes)}</span></p>
              <p className="text-[12px] text-fg-secondary mt-0.5">{now.detail}</p>
              {now.links && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {now.links.map(l => <button key={l.href + l.label} onClick={() => onOpen(l.href)} className="text-[11.5px] rounded-full px-2 py-[2px] bg-surface-1 border border-accent/40 text-accent hover:underline">{l.label} →</button>)}
                </div>
              )}
            </div>
            <button onClick={() => onStart(now.key)} disabled={!!active && active.block_key !== now.key}
              className={`${modalSaveButtonClass} inline-flex items-center gap-1.5 !px-5 !py-2.5 !text-[14px]`}>
              <Timer size={15} /> {active?.block_key === now.key ? 'Go to work' : 'Start focus'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-good font-semibold mb-3">✓ Every block done — a good day.</p>
      )}
      <div className="h-[5px] rounded-[3px] bg-border mb-2.5">
        <div className="h-full rounded-[3px] bg-good transition-all" style={{ width: `${(done / Math.max(1, session.blocks.length)) * 100}%` }} />
      </div>
      <ol className="flex flex-col gap-1.5">
        {session.blocks.map((b, i) => {
          const isActive = active?.block_key === b.key
          const isBank = b.key.startsWith('bank:')
          const answered = isBank ? doneToday[b.key.slice(5)] ?? 0 : 0
          return (
            <li key={b.key} className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-2 ${b.done ? 'bg-good-soft' : isActive ? 'bg-accent-soft' : 'bg-surface-2'}`}>
              {/* Status only — blocks complete from the work itself (a question
                  block's minutes reached, mock saved, focus Finish), never by hand. */}
              <span aria-label={b.done ? 'Done' : 'Not done'} title={!b.done && isBank ? `Completes at ${hm(b.minutes)} of practice (time focused, or answers × minutes per question)` : undefined}
                className={`mt-0.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${b.done ? 'bg-good border-good text-on-good' : 'border-border-strong'}`}>
                {b.done && <Check size={11} strokeWidth={3} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-[12.5px] font-semibold ${b.done ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{i + 1}. {b.label}{isActive && <span className="text-accent font-bold"> ● focusing</span>}</p>
                  <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{isBank && !b.done ? `${hm(Math.floor(blockProgress(b, ctx)))}/${hm(b.minutes)} · ${answered} answered` : hm(b.minutes)}</span>
                </div>
                <p className="text-[11.5px] text-fg-secondary mt-0.5 hidden sm:block">{b.detail}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {!b.done && <button onClick={() => onStart(b.key)} disabled={!!active && !isActive} className="text-[11.5px] font-semibold text-accent hover:underline disabled:opacity-40">{isActive ? 'Go' : 'Start'}</button>}
                <button onClick={() => onOpen(b.href)} className="text-[11px] text-fg-tertiary hover:text-accent">Open →</button>
              </div>
            </li>
          )
        })}
      </ol>
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


// ---------------- Readiness gates ----------------

function tierFor(score: number | null): ReadinessTier {
  if (score === null) return 'not_started'
  return score >= 80 ? 'strong' : score >= 60 ? 'ready' : score >= 40 ? 'developing' : 'needs_work'
}

export function GatesCard({ cells, war }: { cells: ReadinessCell[]; war: WarReadiness }) {
  return (
    <Card title="Readiness Gates" action={<span className="text-[11px] text-fg-tertiary tabular-nums">avg {war.weightedAvg} · bottleneck {war.lowest?.label ?? '—'}</span>}>
      <ul className="flex flex-col gap-1.5">
        {[...cells].sort((a, b) => ((a.score ?? 0) - GATES[a.key].gate) - ((b.score ?? 0) - GATES[b.key].gate)).map(c => {
          const gate = GATES[c.key].gate
          const cfg = READINESS_CONFIG[tierFor(c.score)]
          return (
            <li key={c.key}>
              <div className="flex items-center justify-between text-[12px] mb-[3px] gap-2">
                <span className="font-medium text-fg-primary truncate">{(c.score ?? 0) >= gate ? '🟢' : '🔴'} {c.label}</span>
                <span className="text-[11px] whitespace-nowrap"><span className="text-fg-tertiary hidden sm:inline">{c.basis} · </span><span className={`font-semibold tabular-nums ${scoreCls(c.score, gate)}`}>{c.score ?? '—'}</span><span className="text-fg-tertiary">/{gate}</span></span>
              </div>
              <div className="relative h-[5px] rounded-[3px] bg-border">
                <div className="h-full rounded-[3px]" style={{ width: `${c.score ?? 0}%`, background: c.score === null ? 'var(--text-tertiary)' : cfg.color }} />
                <span className="absolute -top-[2px] h-[9px] w-[2px] bg-fg-primary/70" style={{ left: `${gate}%` }} aria-hidden />
              </div>
            </li>
          )
        })}
        <li className="flex items-center justify-between text-[12px] pt-1 border-t border-surface-3 mt-1">
          <span className="font-medium text-fg-primary">{(war.mockAvg ?? 0) >= 8 ? '🟢' : '🔴'} Mock average (last 5 reviewed)</span>
          <span className={`text-[11px] font-semibold tabular-nums ${scoreCls(war.mockAvg === null ? null : war.mockAvg * 10, 80)}`}>{war.mockAvg ?? '—'}<span className="text-fg-tertiary font-normal">/10 · gate 8</span></span>
        </li>
      </ul>
      <p className="text-[10.5px] text-fg-tertiary mt-2">Readiness = weighted average × (0.5 + 0.5 × lowest area). Tick = gate. Blind spots count as 0.</p>
    </Card>
  )
}

// ---------------- Revision + weakness ----------------

const DOT: Record<RevisionItem['status'], string> = { overdue: '🔴', today: '🔴', tomorrow: '🟠', later: '🟡' }

export function RevisionCard({ items, onOpen }: { items: RevisionItem[]; onOpen: (category: string, topic: string) => void }) {
  return (
    <Card title="Revision Queue" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{items.filter(i => i.status === 'overdue' || i.status === 'today').length} due</span>}>
      {items.length === 0 ? (
        <p className="text-[12px] text-fg-tertiary">Empty. Topics whose rated answers average under 7/10 come back here (1–4 days by rating).</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.slice(0, 8).map(i => (
            <li key={i.topic}>
              <button onClick={() => onOpen(i.category, i.topic)} className="w-full flex items-baseline justify-between gap-2 text-left rounded-md hover:bg-surface-2 px-1 -mx-1 py-0.5">
                <span className="text-[12.5px] text-fg-primary truncate">{DOT[i.status]} {i.topic}</span>
                <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{i.avgRating}/10 · {i.status === 'overdue' ? `${i.daysOverdue}d overdue` : i.status === 'later' ? i.due.slice(5) : i.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function WeaknessCard({ items, onOpen }: { items: TopicWeakness[]; onOpen: (category: string, topic: string) => void }) {
  return (
    <Card title="Weakest Topics" action={<span className="text-[11px] text-fg-tertiary">weakness 0–100</span>}>
      <ul className="flex flex-col gap-1">
        {items.slice(0, 6).map(w => (
          <li key={w.topic}>
            <button onClick={() => onOpen(w.category, w.topic)} className="w-full text-left rounded-md hover:bg-surface-2 px-1 -mx-1 py-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] text-fg-primary truncate">{w.topic}</span>
                <span className={`text-[11.5px] font-bold tabular-nums ${w.score >= 70 ? 'text-risk' : w.score >= 50 ? 'text-warn' : 'text-fg-secondary'}`}>{w.score}</span>
              </div>
              <p className="text-[10.5px] text-fg-tertiary tabular-nums">{w.rated ? `avg ${w.avgRating}/10 · ${w.struggles} struggle${w.struggles === 1 ? '' : 's'}` : 'unrated'} · {w.daysSince === null ? 'never practiced' : `${w.daysSince}d ago`}</p>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] text-fg-tertiary mt-2">struggle rate×40 + rating gap×25 + days idle×15 + importance×20</p>
    </Card>
  )
}

// ---------------- Forecast ----------------

export function ForecastCard({ forecast, today }: { forecast: { date: string; forecast: Forecast } | null; today: string }) {
  const [state, setState] = useState(forecast)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  const f = state?.forecast
  return (
    <Card title="If you interviewed tomorrow…" action={
      state?.date !== today ? (
        <button disabled={busy} onClick={() => { setError(null); start(guard(async () => { const r = await generatePrepForecast(); if (r.forecast) setState({ date: today, forecast: r.forecast }); else setError(r.error) })) }}
          className="text-[11.5px] text-accent hover:underline inline-flex items-center gap-1 disabled:opacity-50"><Sparkles size={12} /> {busy ? 'Forecasting…' : state ? 'Refresh' : 'Forecast'}</button>
      ) : <span className="text-[11px] text-fg-tertiary">{state.date}</span>
    }>
      {error && <p className="text-[12px] text-risk mb-2">{error}</p>}
      {busy && <div className="space-y-2">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
      {!busy && !f && <p className="text-[12px] text-fg-tertiary">Weekly AI forecast (the evening before your rest day via Telegram, or on demand): what would go well, what would fail, and the question most likely to sink you.</p>}
      {!busy && f && (
        <div className="text-[12px]">
          <p className="text-fg-secondary">Confidence <span className={`font-bold tabular-nums ${f.confidence >= 75 ? 'text-good' : f.confidence >= 55 ? 'text-warn' : 'text-risk'}`}>{f.confidence}%</span> <span className="text-fg-tertiary">(War readiness on {state!.date})</span></p>
          {f.strengths.length > 0 && <p className="mt-1.5 text-fg-secondary"><span className="font-semibold text-good">Likely strengths: </span>{f.strengths.join(' · ')}</p>}
          {f.failures.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {f.failures.map((x, i) => <li key={i} className="text-fg-secondary"><span className="font-semibold text-risk">✗ {x.area}</span> — {x.why}</li>)}
            </ul>
          )}
          {f.riskQuestion && <p className="mt-1.5 text-fg-primary border-l-2 border-risk pl-2"><span className="font-semibold">Highest-risk question:</span> “{f.riskQuestion}”</p>}
          {f.fixFirst.length > 0 && <ol className="mt-1.5 list-decimal pl-4 text-fg-secondary">{f.fixFirst.map((x, i) => <li key={i}>{x}</li>)}</ol>}
        </div>
      )}
    </Card>
  )
}
