'use client'

import { useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import Card from '@/components/Card'
import FilterPill from '@/components/FilterPill'
import { CHART_GRID_STROKE, CHART_AXIS_TICK, CHART_TOOLTIP_CLASS, HEALTH_METRIC_CHART_COLOR } from '@/lib/chart-theme'
import type { HealthMetric, MetricField } from '../types'

const METRIC_CONFIG: { field: MetricField; label: string; color: string; decimals: number }[] = [
  { field: 'weight_kg', label: 'Weight',   color: HEALTH_METRIC_CHART_COLOR.weight_kg, decimals: 1 },
  { field: 'calories',  label: 'Calories', color: HEALTH_METRIC_CHART_COLOR.calories, decimals: 0 },
  { field: 'protein_g', label: 'Protein',  color: HEALTH_METRIC_CHART_COLOR.protein_g, decimals: 0 },
  { field: 'steps',     label: 'Steps',    color: HEALTH_METRIC_CHART_COLOR.steps, decimals: 0 },
]

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, decimals }: { active?: boolean; payload?: { payload: { date: string; value: number | null } }[]; decimals: number }) {
  if (!active || !payload?.length || payload[0].payload.value === null) return null
  const point = payload[0].payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="text-fg-tertiary">{formatDate(point.date)}</p>
      <p className="text-fg-primary font-semibold tabular-nums">{point.value!.toFixed(decimals)}</p>
    </div>
  )
}

// Health Trend — same pattern as Dashboard's LifeScoreTrend: fed entirely by
// metrics already fetched for the page (30 days), which used to be thrown
// away after computing a 7-day average. Weekly/Monthly is just a slice of
// the same array; recharts is lazy-loaded (see HealthTrendLazy.tsx).
export default function HealthTrend({ metrics }: { metrics: HealthMetric[] }) {
  const [field, setField] = useState<MetricField>('weight_kg')
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly')

  const config = METRIC_CONFIG.find(m => m.field === field)!
  const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date))
  const sliced = range === 'weekly' ? sorted.slice(-7) : sorted
  const points = sliced.map(m => ({ date: m.date, value: m[field] }))
  const loggedCount = points.filter(p => p.value !== null).length

  return (
    <Card title="Health Trend" padding="p-3.5" action={
      <div className="flex gap-1.5">
        <FilterPill label="Weekly" active={range === 'weekly'} onClick={() => setRange('weekly')} />
        <FilterPill label="Monthly" active={range === 'monthly'} onClick={() => setRange('monthly')} />
      </div>
    }>
      <div className="flex gap-1.5 mb-3">
        {METRIC_CONFIG.map(m => (
          <FilterPill key={m.field} label={m.label} active={field === m.field} onClick={() => setField(m.field)} />
        ))}
      </div>
      {loggedCount < 2 ? (
        <p className="text-sm text-fg-secondary py-6 text-center">Not enough {config.label.toLowerCase()} logged yet — check back after a few more days</p>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID_STROKE} strokeWidth={1} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={CHART_AXIS_TICK}
                axisLine={{ stroke: CHART_GRID_STROKE }}
                tickLine={false}
                interval={range === 'weekly' ? 0 : 4}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickFormatter={v => Number(v).toFixed(config.decimals)}
                axisLine={false}
                tickLine={false}
                width={44}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip decimals={config.decimals} />} cursor={{ stroke: CHART_GRID_STROKE, strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                connectNulls
                activeDot={{ r: 5, fill: config.color, stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
