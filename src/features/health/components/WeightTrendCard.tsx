'use client'

import { useState } from 'react'
import type { WeightTrend } from '../calculations'

const W = 300
const H = 56
const PAD = 4

function fmtDate(date: string, withYear = false) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) })
}

// Stat tile + sparkline: latest weight, window change, actual kg/week vs the
// plan's target pace, and ETA to normal BMI at the current rate. Hand-rolled
// SVG (a single series doesn't justify pulling recharts onto this page) with
// a hover crosshair + value readout.
export default function WeightTrendCard({ trend, targetPaceKg, normalBmiWeightKg }: {
  trend: WeightTrend | null
  targetPaceKg: number | null
  normalBmiWeightKg: number | null
}) {
  const [hover, setHover] = useState<number | null>(null)

  if (!trend) {
    return (
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-md)]">
        <p className="text-[13px] font-bold text-fg-primary mb-1">Weight Trend</p>
        <p className="text-xs text-fg-quaternary">Log weight on at least 3 days across a week to see your trend.</p>
      </div>
    )
  }

  const { points } = trend
  const x0 = new Date(points[0].date).getTime()
  const span = Math.max(1, new Date(points[points.length - 1].date).getTime() - x0)
  const ws = points.map(p => p.weight)
  const min = Math.min(...ws) - 0.3
  const max = Math.max(...ws) + 0.3
  const coords = points.map(p => ({
    x: PAD + ((new Date(p.date).getTime() - x0) / span) * (W - PAD * 2),
    y: PAD + (1 - (p.weight - min) / (max - min)) * (H - PAD * 2),
  }))
  const path = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    coords.forEach((c, i) => { if (Math.abs(c.x - x) < Math.abs(coords[best].x - x)) best = i })
    setHover(best)
  }

  const losing = trend.kgPerWeek < 0
  const rateColor = losing ? 'text-good' : 'text-risk'
  const shown = hover !== null ? points[hover] : null

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-md)]">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold text-fg-primary">Weight Trend</p>
        <p className="text-[11px] text-fg-tertiary tabular-nums">
          {shown ? <>{fmtDate(shown.date)} · <span className="text-fg-primary font-semibold">{shown.weight} kg</span></> : `${points.length} weigh-ins · last 30 days`}
        </p>
      </div>
      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
        <span className="text-xl font-bold text-fg-primary">{trend.latest} kg</span>
        <span className={`text-xs font-semibold ${trend.change <= 0 ? 'text-good' : 'text-risk'}`}>{trend.change > 0 ? '+' : ''}{trend.change} kg</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-14 mt-1.5 touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Weight over the last 30 days, from ${points[0].weight} to ${trend.latest} kg`}
      >
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={coords[hover].x} x2={coords[hover].x} y1={0} y2={H} stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle cx={coords[hover].x} cy={coords[hover].y} r={3.5} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-[11.5px]">
        <p className="text-fg-tertiary">Actual pace <span className={`font-semibold ${rateColor}`}>{trend.kgPerWeek > 0 ? '+' : ''}{trend.kgPerWeek} kg/wk</span></p>
        {targetPaceKg !== null && targetPaceKg > 0 && <p className="text-fg-tertiary">Plan pace <span className="font-semibold text-fg-secondary">−{targetPaceKg} kg/wk</span></p>}
        {normalBmiWeightKg !== null && (
          <p className="text-fg-tertiary col-span-2">
            Normal BMI ({normalBmiWeightKg} kg): <span className="font-semibold text-fg-secondary">{trend.etaDate ? `~${fmtDate(trend.etaDate, true)} at this pace` : 'not trending toward it yet'}</span>
          </p>
        )}
      </div>
    </div>
  )
}
