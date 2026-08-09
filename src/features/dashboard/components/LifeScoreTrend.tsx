'use client'

import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import Card from '@/components/Card'

interface ScorePoint { date: string; life: number }

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScorePoint }[] }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="bg-surface-2 border border-surface-3 rounded-lg px-2.5 py-1.5 text-xs">
      <p className="text-fg-tertiary">{formatDate(point.date)}</p>
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
// last 7 of the same 30 points. recharts was already an installed
// dependency with zero prior usage anywhere in the app. Line/grid colors are
// CSS vars (not hardcoded hex) so the chart repaints correctly in light mode.
export default function LifeScoreTrend({ scoreHistory }: { scoreHistory: ScorePoint[] }) {
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly')
  const points = range === 'weekly' ? scoreHistory.slice(-7) : scoreHistory
  const latest = points.length > 0 ? points[points.length - 1].life : null
  const delta = points.length >= 2 ? points[points.length - 1].life - points[0].life : null

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
              <span className={`text-xs font-medium ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-fg-tertiary'}`}>
                {delta > 0 ? '+' : ''}{delta} vs. {range === 'weekly' ? 'last week' : '30 days ago'}
              </span>
            )}
          </div>
          <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                interval={range === 'weekly' ? 0 : 4}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="life"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}
