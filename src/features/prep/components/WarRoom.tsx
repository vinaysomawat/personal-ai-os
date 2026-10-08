'use client'

import { useEffect, useState, useTransition } from 'react'
import { Check, Pause, Play, Sparkles, Square, Timer } from 'lucide-react'
import Card from '@/components/Card'
import { modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { READINESS_CONFIG, type ReadinessTier } from '@/features/career/types'
import { endFocusSession, generatePrepForecast, toggleFocusSessionPause } from '../actions'
import { GATES, coachLine, dayPace, focusSeconds, hm, nowBlock, type FocusSession, type Forecast, type RevisionItem, type TopicWeakness, type WarReadiness } from '../war'
import type { PrepSession, ReadinessCell } from '../types'

const mmss = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`
// IST wall-clock hour as a float (the prep day is judged in IST).
const istHour = () => { const d = new Date(Date.now() + 5.5 * 3600_000); return d.getUTCHours() + d.getUTCMinutes() / 60 }
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

export function WarHeader({ war, daysLeft, targetDate, session, focusedMinutes, nextInterview }: {
  war: WarReadiness; daysLeft: number | null; targetDate: string | null; session: PrepSession | null; focusedMinutes: number
  nextInterview: { company: string; kind: string; scheduled_at: string } | null
}) {
  const hour = istHour()
  const pace = dayPace(session?.blocks ?? [], focusedMinutes, hour)
  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-fg-primary">🔥 Interview War Mode{daysLeft !== null && <span className="font-semibold text-accent"> · D-{daysLeft}</span>}{targetDate && <span className="font-normal text-fg-tertiary"> · target {targetDate}</span>}</p>
          <p className={`text-[12.5px] mt-1 ${pace.behindMinutes >= 30 || (pace.blocksDone === 0 && hour >= 10) ? 'text-risk' : 'text-fg-secondary'}`}>{coachLine(pace, hour)}</p>
          {nextInterview && (
            <a href="/career" className="block text-[12px] font-semibold text-accent mt-0.5 hover:underline">📅 Next interview: {nextInterview.company} · {nextInterview.kind.replace(/_/g, ' ')} · {new Date(nextInterview.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} →</a>
          )}
          <p className="text-[11.5px] text-fg-tertiary mt-0.5 tabular-nums">Focused {hm(focusedMinutes)} / {hm(pace.plannedMinutes)} planned · done {hm(pace.doneMinutes)} · expected by now {hm(pace.expectedMinutes)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-[22px] font-bold leading-none tabular-nums ${war.ready ? 'text-good' : war.overall >= 60 ? 'text-warn' : 'text-risk'}`}>{war.overall}%</p>
          <p className={`text-[11px] font-bold mt-1 ${war.ready ? 'text-good' : 'text-risk'}`}>{war.ready ? '🔥 TOP 1% READY' : `❌ NOT READY · ${war.blockers.length} blocker${war.blockers.length === 1 ? '' : 's'}`}</p>
        </div>
      </div>
      {war.blockers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {war.blockers.slice(0, 6).map(b => (
            <span key={b.key} className="text-[11px] rounded-full px-2 py-[2px] bg-risk-soft text-risk tabular-nums">🔴 {b.label} {b.score ?? '—'}/{b.gate}</span>
          ))}
          {war.blockers.length > 6 && <span className="text-[11px] text-fg-tertiary">+{war.blockers.length - 6} more</span>}
        </div>
      )}
    </Card>
  )
}

// ---------------- Mission ----------------

export function MissionCard({ session, focusSessions, onToggle, onStart, onOpen }: {
  session: PrepSession | null
  focusSessions: FocusSession[]
  onToggle: (key: string) => void
  onStart: (key: string) => void
  onOpen: (href: string) => void
}) {
  if (!session) return <Card title="Today's Mission"><p className="text-[12.5px] text-fg-tertiary">Couldn&apos;t build today&apos;s plan — reload.</p></Card>
  const now = nowBlock(session.blocks)
  const active = focusSessions.find(f => f.status === 'active')
  const minutesOn = (key: string) => Math.round(focusSessions.filter(f => f.block_key === key).reduce((s, f) => s + focusSeconds(f), 0) / 60)
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
            </div>
            <button onClick={() => onStart(now.key)} disabled={!!active && active.block_key !== now.key}
              className={`${modalSaveButtonClass} inline-flex items-center gap-1.5 !px-5 !py-2.5 !text-[14px]`}>
              <Timer size={15} /> {active?.block_key === now.key ? 'Resume focus' : 'Start focus'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-good font-semibold mb-3">✓ Every block done. It only counts if tomorrow looks the same.</p>
      )}
      <div className="h-[5px] rounded-[3px] bg-border mb-2.5">
        <div className="h-full rounded-[3px] bg-good transition-all" style={{ width: `${(done / Math.max(1, session.blocks.length)) * 100}%` }} />
      </div>
      <ol className="flex flex-col gap-1.5">
        {session.blocks.map((b, i) => {
          const isActive = active?.block_key === b.key
          const spent = minutesOn(b.key)
          return (
            <li key={b.key} className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-2 ${b.done ? 'bg-good-soft' : isActive ? 'bg-accent-soft' : 'bg-surface-2'}`}>
              <button onClick={() => onToggle(b.key)} aria-label={b.done ? `Mark ${b.label} not done` : `Mark ${b.label} done`} aria-pressed={b.done}
                className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 ${b.done ? 'bg-good border-good text-on-good' : 'border-border-strong hover:border-accent'}`}>
                {b.done && <Check size={11} strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-[12.5px] font-semibold ${b.done ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{i + 1}. {b.label}{isActive && <span className="text-accent font-bold"> ● focusing</span>}</p>
                  <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{spent > 0 ? `${hm(spent)} / ` : ''}{hm(b.minutes)}</span>
                </div>
                <p className="text-[11.5px] text-fg-secondary mt-0.5 hidden sm:block">{b.detail}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {!b.done && <button onClick={() => onStart(b.key)} disabled={!!active && !isActive} className="text-[11.5px] font-semibold text-accent hover:underline disabled:opacity-40">{isActive ? 'Resume' : 'Start'}</button>}
                <button onClick={() => onOpen(b.href)} className="text-[11px] text-fg-tertiary hover:text-accent">Open →</button>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

// ---------------- Focus overlay ----------------

// Full-screen focus timer: everything else is hidden until Finish / Stop.
export function FocusOverlay({ focus, block, onChange, onEnded, onOpen }: {
  focus: FocusSession
  block: { label: string; detail: string; href: string } | null
  onChange: (f: FocusSession) => void
  onEnded: (f: FocusSession | null, session: PrepSession | null) => void
  onOpen: (href: string) => void
}) {
  const now = useNow(!focus.paused_at)
  const [busy, start] = useTransition()
  const spent = focusSeconds(focus, now)
  const left = focus.planned_minutes * 60 - spent
  const paused = !!focus.paused_at
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return (
    <div className="fixed inset-0 z-[70] bg-background flex items-center justify-center p-4" role="dialog" aria-label="Focus session">
      <div className="w-full max-w-[520px] text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-accent">🔒 Focus session{paused ? ' · paused' : ''}</p>
        <p className="text-[22px] font-bold text-fg-primary mt-2 leading-tight">{focus.label}</p>
        {block?.detail && <p className="text-[13px] text-fg-secondary mt-1.5">{block.detail}</p>}
        <p className={`text-[64px] font-bold tabular-nums leading-none mt-6 ${left < 0 ? 'text-risk' : paused ? 'text-fg-tertiary' : 'text-fg-primary'}`}>{mmss(left)}</p>
        <p className="text-[12px] text-fg-tertiary mt-2 tabular-nums">{left < 0 ? 'over planned time · ' : ''}focused {mmss(spent)} of {focus.planned_minutes}:00 · {focus.interruptions} interruption{focus.interruptions === 1 ? '' : 's'}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-7">
          <button disabled={busy} onClick={() => start(async () => { const f = await toggleFocusSessionPause(focus.id); if (f) onChange(f) })} className={`${modalCancelButtonClass} inline-flex items-center gap-1.5`}>
            {paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
          </button>
          <button disabled={busy} onClick={() => start(async () => { const r = await endFocusSession(focus.id, true); onEnded(r.focus, r.session) })} className={`${modalSaveButtonClass} inline-flex items-center gap-1.5`}>
            <Check size={14} /> Finish block
          </button>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          {block?.href && <button onClick={() => onOpen(block.href)} className="text-[12px] text-accent hover:underline">Open the work →</button>}
          <button disabled={busy} onClick={() => start(async () => { const r = await endFocusSession(focus.id, false); onEnded(r.focus, null) })} className="text-[12px] text-fg-tertiary hover:text-risk inline-flex items-center gap-1">
            <Square size={11} /> Stop without finishing
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact bar shown while a focus session runs and the overlay is hidden
// (e.g. after "Open the work").
export function FocusBar({ focus, onShow }: { focus: FocusSession; onShow: () => void }) {
  const now = useNow(!focus.paused_at)
  const left = focus.planned_minutes * 60 - focusSeconds(focus, now)
  return (
    <button onClick={onShow} className="fixed bottom-[86px] md:bottom-7 left-1/2 -translate-x-1/2 z-[30] rounded-full bg-accent text-white text-[12.5px] font-semibold px-4 py-2 shadow-[0_8px_24px_var(--shadow-lg)] inline-flex items-center gap-2 tabular-nums">
      <Timer size={14} /> {focus.label} · {mmss(left)}{focus.paused_at ? ' · paused' : ''}
    </button>
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
        <button disabled={busy} onClick={() => { setError(null); start(async () => { const r = await generatePrepForecast(); if (r.forecast) setState({ date: today, forecast: r.forecast }); else setError(r.error) }) }}
          className="text-[11.5px] text-accent hover:underline inline-flex items-center gap-1 disabled:opacity-50"><Sparkles size={12} /> {busy ? 'Forecasting…' : state ? 'Refresh' : 'Forecast'}</button>
      ) : <span className="text-[11px] text-fg-tertiary">{state.date}</span>
    }>
      {error && <p className="text-[12px] text-risk mb-2">{error}</p>}
      {busy && <div className="space-y-2">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
      {!busy && !f && <p className="text-[12px] text-fg-tertiary">Weekly AI forecast (Sunday night via Telegram, or on demand): what would go well, what would fail, and the question most likely to sink you.</p>}
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
