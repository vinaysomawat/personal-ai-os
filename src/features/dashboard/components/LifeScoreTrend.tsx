'use client'

import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import Card from '@/components/Card'
import FilterPill from '@/components/FilterPill'

interface ScorePoint { date: string; life: number }

const ACCENT = '#7c6af7'
const GRID = '#26263a'

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

// Weekly/Monthly Life Score trend — fed entirely by scoreHistory, which
// getDashboardData() already fetches (30 days of life_score_logs) for the
// score-explainer's day-over-day diff. No new query: Weekly is just the
// last 7 of the same 30 points. recharts was already an installed
// dependency with zero prior usage anywhere in the app.
export default function LifeScoreTrend({ scoreHistory }: { scoreHistory: ScorePoint[] }) {
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly')
  const points = range === 'weekly' ? scoreHistory.slice(-7) : scoreHistory
  const latest = points.length > 0 ? points[points.length - 1].life : null
  const delta = points.length >= 2 ? points[points.length - 1].life - points[0].life : null

  return (
    <Card title="Life Score Trend" padding="p-3.5" action={
      <div className="flex gap-1.5">
        <FilterPill label="Weekly" active={range === 'weekly'} onClick={() => setRange('weekly')} />
        <FilterPill label="Monthly" active={range === 'monthly'} onClick={() => setRange('monthly')} />
      </div>
    }>
      {points.length < 2 ? (
        <p className="text-sm text-fg-secondary py-6 text-center">Not enough history yet — check back after a few more days</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="text-2xl font-bold text-fg-primary tabular-nums">{latest}</span>
            {delta !== null && (
              <span className={`text-xs font-medium ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-fg-tertiary'}`}>
                {delta > 0 ? '+' : ''}{delta} vs. {range === 'weekly' ? 'last week' : '30 days ago'}
              </span>
            )}
          </div>
          <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: GRID }}
                tickLine={false}
                interval={range === 'weekly' ? 0 : 4}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="life"
                stroke={ACCENT}
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, fill: ACCENT, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}
