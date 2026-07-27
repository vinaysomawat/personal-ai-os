'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import Card from '@/components/Card'
import type { DifficultyProgressionPoint } from '../daily-core'

const GRID = 'var(--border)'
const AXIS_TEXT = 'var(--text-tertiary)'
const SURFACE = 'var(--card)'
const COLORS = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }

function formatWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-2 border border-surface-3 rounded-lg px-2.5 py-1.5 text-xs space-y-0.5">
      <p className="text-fg-tertiary">Week of {formatWeek(label ?? '')}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span className="w-2 h-0.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-fg-secondary">{p.name}:</span>
          <span className="text-fg-primary font-semibold tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// Same recharts + lazy-load pattern as Dashboard's LifeScoreTrend and
// Health's HealthTrend — fed by computeDifficultyProgression, a pure
// function over history already fetched for the Recommended card's weak
// areas, no separate query. Multi-series (easy/medium/hard), so per the
// dataviz method this one keeps its legend rather than going legend-less.
export default function DifficultyProgression({ data }: { data: DifficultyProgressionPoint[] }) {
  return (
    <Card title="Difficulty Progression" padding="p-3.5">
      {data.length < 2 ? (
        <p className="text-sm text-fg-secondary py-6 text-center">Not enough history yet — check back after a few more weeks</p>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
              <XAxis dataKey="weekStart" tickFormatter={formatWeek} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRID, strokeWidth: 1 }} />
              <Legend
                iconType="plainline"
                formatter={(value: string) => <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{value}</span>}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Line type="monotone" dataKey="easy" name="Easy" stroke={COLORS.easy} strokeWidth={2} strokeLinecap="round" dot={false} activeDot={{ r: 4, fill: COLORS.easy, stroke: SURFACE, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="medium" name="Medium" stroke={COLORS.medium} strokeWidth={2} strokeLinecap="round" dot={false} activeDot={{ r: 4, fill: COLORS.medium, stroke: SURFACE, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="hard" name="Hard" stroke={COLORS.hard} strokeWidth={2} strokeLinecap="round" dot={false} activeDot={{ r: 4, fill: COLORS.hard, stroke: SURFACE, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
