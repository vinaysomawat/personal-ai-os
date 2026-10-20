'use client'

import { useState } from 'react'
import { daysAgoIST } from '@/lib/date'
import type { MoodLog } from '@/features/health/mood'

// 14-day mood / energy line (1–5), below the Hunt Hero. Data comes from the
// nightly Telegram check-in. Colors validated as a pair in both themes
// (dataviz validator): mood = --chart-1, energy = amber #d97706 (the dark
// --chart-4 is too light for a line on the card).
const SERIES = [
  { key: 'mood', label: 'Mood', color: 'var(--chart-1)' },
  { key: 'energy', label: 'Energy', color: '#d97706' },
] as const
const DAYS = 14
const fmt = (date: string) => new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })

export default function MoodTrend({ logs }: { logs: MoodLog[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const dates = Array.from({ length: DAYS }, (_, i) => daysAgoIST(DAYS - 1 - i))
  const byDate = new Map(logs.map(l => [l.date, l]))
  const x = (i: number) => ((i + 0.5) / DAYS) * 100
  const y = (v: number) => 100 - ((v - 1) / 4) * 100
  // A line breaks over days without a check-in.
  const segments = (key: 'mood' | 'energy') => {
    const out: string[][] = [[]]
    dates.forEach((d, i) => {
      const l = byDate.get(d)
      if (l) out[out.length - 1].push(`${x(i)},${y(l[key])}`)
      else if (out[out.length - 1].length) out.push([])
    })
    return out.filter(s => s.length > 1)
  }
  const latest = logs[logs.length - 1] ?? null
  const shown = hover !== null ? byDate.get(dates[hover]) ?? null : null
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-[var(--card-pad-sm)] min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px]">Mood &amp; energy · 14 days</p>
        <div className="flex items-center gap-3 text-[11px] text-fg-secondary tabular-nums">
          {SERIES.map(s => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="w-[10px] h-[2px] rounded-full" style={{ background: s.color }} aria-hidden />{s.label}{latest ? ` ${latest[s.key]}` : ''}
            </span>
          ))}
        </div>
      </div>
      {logs.length === 0 ? (
        <p className="text-[12px] text-fg-tertiary mt-1.5">No check-ins yet — reply to the 9:30pm Telegram message with e.g. &quot;mood 3 energy 4&quot;.</p>
      ) : (
        <>
          <p className="text-[11px] text-fg-secondary mt-0.5 h-[15px] tabular-nums">
            {hover !== null ? (shown ? `${fmt(dates[hover])} · mood ${shown.mood} · energy ${shown.energy}${shown.note ? ` · ${shown.note}` : ''}` : `${fmt(dates[hover])} · no check-in`) : ''}
          </p>
          <div className="relative h-[56px] mt-0.5" role="img" aria-label={`Mood and energy, last 14 days: ${dates.map(d => { const l = byDate.get(d); return l ? `${fmt(d)} mood ${l.mood} energy ${l.energy}` : `${fmt(d)} none` }).join('; ')}`}
            onMouseLeave={() => setHover(null)}>
            {/* Recessive grid at 1, 3 and 5. */}
            {[1, 3, 5].map(v => <div key={v} className="absolute inset-x-0 border-t border-border/70" style={{ top: `${y(v)}%` }} aria-hidden />)}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
              {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={100} stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
              {SERIES.map(s => segments(s.key).map((pts, i) => (
                <polyline key={`${s.key}${i}`} points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              )))}
            </svg>
            {/* Markers in HTML so they stay round at any width; 2px card ring. */}
            {dates.map((d, i) => {
              const l = byDate.get(d)
              return l ? SERIES.map(s => (
                <span key={`${d}${s.key}`} className="absolute w-[8px] h-[8px] -ml-[4px] -mt-[4px] rounded-full ring-2 ring-[var(--card)]" style={{ left: `${x(i)}%`, top: `${y(l[s.key])}%`, background: s.color }} aria-hidden />
              )) : null
            })}
            {/* Hover targets: one full-height column per day. */}
            <div className="absolute inset-0 flex">
              {dates.map((d, i) => <div key={d} className="flex-1 h-full" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />)}
            </div>
          </div>
          <div className="flex justify-between text-[9.5px] text-fg-tertiary mt-1 tabular-nums">
            <span>{fmt(dates[0])}</span><span>Today</span>
          </div>
        </>
      )}
    </div>
  )
}
