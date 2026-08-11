'use client'

import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, YAxis, ReferenceLine, Tooltip } from 'recharts'
import Card from '@/components/Card'
import { CHART_GRID_STROKE, CHART_TOOLTIP_CLASS } from '@/lib/chart-theme'

interface ScorePoint { date: string; life: number }

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdayLabel(dateStr: string): string {
  return WEEKDAY[new Date(`${dateStr}T00:00:00`).getDay()]
}

function dayOfMonthLabel(dateStr: string): string {
  return String(new Date(`${dateStr}T00:00:00`).getDate())
}

// 7 evenly-spaced captions under the chart, same as the design's monthly
// view (its own mock hardcodes literal day numbers "1/6/11/16/21/26/30" as
// decorative captions independent of the 30 plotted points, not real axis
// ticks). Picking 7 evenly-spaced indices into whatever real date range is
// showing reproduces that same "captions, not 1:1 with data" behavior
// without assuming there are always exactly 30 points.
function monthlyCaptions(points: ScorePoint[]): string[] {
  if (points.length <= 7) return points.map(p => dayOfMonthLabel(p.date))
  const n = points.length
  return Array.from({ length: 7 }, (_, i) => dayOfMonthLabel(points[Math.round((i * (n - 1)) / 6)].date))
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScorePoint }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="text-fg-tertiary">{new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
      <p className="text-fg-primary font-semibold tabular-nums">{point.life}</p>
    </div>
  )
}

// Segmented tab track (design source's trendTabStyle recipe) — local to this
// component rather than the shared FilterPill, whose solid-accent-fill look
// is a deliberately different pattern used for status filters elsewhere.
function TrendTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-[11px] py-[5px] text-[11.5px] font-semibold ${active ? 'bg-surface-1 text-fg-primary shadow-[0_1px_2px_var(--shadow-sm)]' : 'bg-transparent text-fg-tertiary'}`}
    >
      {label}
    </button>
  )
}

// Weekly/Monthly Life Score trend — fed entirely by scoreHistory, which
// getDashboardData() already fetches (30 days of life_score_logs) for the
// score-explainer's day-over-day diff. No new query: Weekly is just the
// last 7 of the same 30 points.
//
// The Y domain is intentionally the *series'* own min/max (with a padding
// margin), not a fixed 0-100 scale — matching the design's dynamic
// pad/min/max math exactly (see CHARTS-AUDIT.md §1) so real trend detail in
// a narrow score range isn't flattened into the middle of a 100-point box.
// The 3 horizontal reference lines sit at the domain's min/mid/max, which —
// because recharts scales the plot area to exactly fill the domain — lands
// them at the same fixed top/middle/bottom positions the design's 3 literal
// SVG <line> elements occupy, regardless of what the data's actual range is.
export default function LifeScoreTrend({ scoreHistory }: { scoreHistory: ScorePoint[] }) {
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly')
  const points = range === 'weekly' ? scoreHistory.slice(-7) : scoreHistory
  const latest = points.length > 0 ? points[points.length - 1].life : null
  const delta = points.length >= 2 ? points[points.length - 1].life - points[0].life : null

  const values = points.map(p => p.life)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const dataRange = Math.max(1, dataMax - dataMin)
  // Design's pad=6 out of chartH=100, drawn inside an inner 100-12=88 unit
  // range — expressed as a fraction of the data range so recharts' domain
  // (which becomes the plot's exact pixel extent) reproduces the same inset.
  const domainPad = dataRange * (6 / 88)
  const domainMin = dataMin - domainPad
  const domainMax = dataMax + domainPad
  const domainMid = (domainMin + domainMax) / 2

  return (
    <Card title="Life Score Trend" action={
      <div className="flex gap-1 bg-surface-2 rounded-lg p-[3px]">
        <TrendTab label="Weekly" active={range === 'weekly'} onClick={() => setRange('weekly')} />
        <TrendTab label="Monthly" active={range === 'monthly'} onClick={() => setRange('monthly')} />
      </div>
    }>
      {points.length < 2 ? (
        <p className="text-sm text-fg-secondary py-6 text-center">Not enough history yet — check back after a few more days</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="text-[22px] font-bold text-fg-primary tabular-nums">{latest}</span>
            {delta !== null && (
              <span className="text-xs font-semibold" style={{ color: delta > 0 ? 'var(--good)' : delta < 0 ? 'var(--risk)' : 'var(--text-tertiary)' }}>
                {delta > 0 ? '+' : ''}{delta} vs. {range === 'weekly' ? 'last Sunday' : '30 days ago'}
              </span>
            )}
          </div>
          <div style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <YAxis hide domain={[domainMin, domainMax]} />
                <ReferenceLine y={domainMin} stroke={CHART_GRID_STROKE} strokeWidth={1} strokeDasharray="2 3" label={{ value: Math.round(domainMin), position: 'insideTopRight', fill: 'var(--text-quaternary)', fontSize: 9 }} />
                <ReferenceLine y={domainMid} stroke={CHART_GRID_STROKE} strokeWidth={1} strokeDasharray="2 3" label={{ value: Math.round(domainMid), position: 'insideTopRight', fill: 'var(--text-quaternary)', fontSize: 9 }} />
                <ReferenceLine y={domainMax} stroke={CHART_GRID_STROKE} strokeWidth={1} strokeDasharray="2 3" label={{ value: Math.round(domainMax), position: 'insideTopRight', fill: 'var(--text-quaternary)', fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
                <Area
                  type="linear"
                  dataKey="life"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="var(--accent-soft)"
                  isAnimationActive={false}
                  dot={range === 'weekly' ? { r: 3, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 1.5 } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2">
            {(range === 'weekly' ? points.map(p => weekdayLabel(p.date)) : monthlyCaptions(points)).map((label, i) => (
              <span key={i} className="text-[10px] text-fg-tertiary">{label}</span>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
