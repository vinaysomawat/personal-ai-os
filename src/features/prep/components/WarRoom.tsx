'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import { generatePrepForecast, savePrepSettings, savePrepTargetDate } from '../actions'
import { LEVELS, levelOf } from '../hunt'
import { bossesLeft, bossesPerDay, daysTo, type Boss } from '../boss'
import { coachLine, paceLabel, paceStatus, readinessTier, type DayPace, type Forecast, type RevisionItem, type TopicWeakness, type WarReadiness } from '../war'
import type { PrepSettings } from '../types'

// ---------------- Header ----------------

export function WarHeader({ war, settings, pace, nextInterview, ladder, today }: {
  war: WarReadiness; settings: PrepSettings; pace: DayPace
  nextInterview: { company: string; kind: string; scheduled_at: string } | null
  ladder: Boss[]; today: string
}) {
  const status = paceStatus(pace)
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const level = levelOf(settings.hours_per_day)
  // A new level rebuilds today's plan (the stored outreach target is kept).
  const save = (hours: number) => startSave(async () => { await savePrepSettings(hours, settings.weekly_outreach_target); router.refresh() })
  const saveDate = (date: string) => startSave(async () => { await savePrepTargetDate(date || null); router.refresh() })
  const left = bossesLeft(ladder)
  const days = daysTo(settings.target_date, today)
  const per = bossesPerDay(left, days)
  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="text-[13px] font-bold text-fg-primary">⚔️ Boss Ladder</p>
            <div role="radiogroup" aria-label="Daily load" className={`inline-flex rounded-[8px] border border-border-strong overflow-hidden ${saving ? 'opacity-60' : ''}`}>
              {LEVELS.map(l => (
                <button key={l.key} role="radio" aria-checked={level.key === l.key} disabled={saving} onClick={() => level.key !== l.key && save(l.hours)}
                  className={`text-[11.5px] px-2 py-[3px] tabular-nums border-l first:border-l-0 border-border-strong ${level.key === l.key ? 'bg-accent text-white font-semibold' : 'text-fg-secondary hover:bg-surface-2'}`}>
                  {l.label} <span className={level.key === l.key ? 'opacity-80' : 'text-fg-tertiary'}>{l.fights}</span>
                </button>
              ))}
            </div>
            <span className="text-[11px] text-fg-tertiary tabular-nums">{level.fights} fights/day</span>
          </div>
          <p className="text-[12.5px] mt-1 text-fg-primary tabular-nums flex flex-wrap items-center gap-x-1.5">
            <span className="font-bold">{left} boss{left === 1 ? '' : 'es'} left</span>
            <span className="text-fg-tertiary">·</span>
            {days !== null && <span className={days < 0 ? 'text-risk' : 'text-fg-secondary'}>{days < 0 ? `${-days}d past` : `${days}d to`}</span>}
            <input type="date" aria-label="Deadline" value={settings.target_date ?? ''} disabled={saving} onChange={e => saveDate(e.target.value)}
              className="bg-transparent border-b border-dashed border-border-strong text-[12px] text-fg-secondary outline-none focus:border-accent w-[118px]" />
            {per !== null && left > 0 && <><span className="text-fg-tertiary">·</span><span className={days !== null && per > 1 ? 'text-risk font-semibold' : 'text-fg-secondary'}>need {per}/day</span></>}
          </p>
          <p className={`text-[12.5px] mt-1 ${status === 'behind' ? 'text-risk' : status === 'ahead' ? 'text-good' : 'text-fg-secondary'}`}>{coachLine(pace)}</p>
          {nextInterview && (
            <a href="/interviews" className="block text-[12px] font-semibold text-accent mt-0.5 hover:underline">📅 Next interview: {nextInterview.company} · {nextInterview.kind.replace(/_/g, ' ')} · {new Date(nextInterview.scheduled_at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} →</a>
          )}
          <p className="text-[11.5px] text-fg-tertiary mt-0.5 tabular-nums"><span className={`font-semibold ${status === 'behind' ? 'text-risk' : status === 'ahead' ? 'text-good' : 'text-fg-secondary'}`}>{paceLabel(pace)}</span> · {pace.donePct}% of plan done · {pace.dayPct}% of 8am–10pm gone · fights {pace.blocksDone}/{pace.blocksTotal}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-[22px] font-bold leading-none tabular-nums ${war.ready || war.interviewReady ? 'text-good' : war.overall >= 60 ? 'text-warn' : 'text-risk'}`}>{war.overall}%</p>
          <p className={`text-[11px] font-bold mt-1 ${readinessTier(war).tone === 'good' ? 'text-good' : 'text-risk'}`}>{readinessTier(war).label}</p>
        </div>
      </div>
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
