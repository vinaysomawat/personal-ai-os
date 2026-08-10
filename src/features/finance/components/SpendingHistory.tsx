'use client'

import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '@/components/Card'
import { CHART_AXIS_TICK, CHART_TOOLTIP_CLASS, FINANCE_CATEGORY_CHART_COLOR, FINANCE_CATEGORY_CHART_FALLBACK } from '@/lib/chart-theme'

interface ExpenseRow { amount: number; category: string; date: string }

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function last12Months(currentMonth: string): string[] {
  const [y, m] = currentMonth.split('-').map(Number)
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: { payload: { month: string; total: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="text-fg-tertiary">{monthLabel(p.month)}</p>
      <p className="text-fg-primary font-semibold tabular-nums">{fmt(p.total)}</p>
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="text-fg-primary font-semibold">{p.name}</p>
      <p className="text-fg-tertiary tabular-nums">{fmt(p.value)}</p>
    </div>
  )
}

// Monthly spend trend (bar) + a click-through pie breakdown for whichever
// month is selected — fed entirely by getFinanceData()'s 12-month
// expenseHistory query, grouped here client-side (deterministic, no AI)
// so switching months needs no extra round-trip.
export default function SpendingHistory({ expenseHistory, currentMonth }: { expenseHistory: ExpenseRow[]; currentMonth: string }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const monthlyTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const e of expenseHistory) {
      const k = monthKey(e.date)
      totals.set(k, (totals.get(k) ?? 0) + Number(e.amount))
    }
    return last12Months(currentMonth).map(month => ({ month, total: totals.get(month) ?? 0 }))
  }, [expenseHistory, currentMonth])

  const monthIndex = monthlyTotals.findIndex(m => m.month === selectedMonth)
  const canGoBack = monthIndex > 0
  const canGoForward = monthIndex !== -1 && monthIndex < monthlyTotals.length - 1

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>()
    for (const e of expenseHistory) {
      if (monthKey(e.date) !== selectedMonth) continue
      totals.set(e.category, (totals.get(e.category) ?? 0) + Number(e.amount))
    }
    return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [expenseHistory, selectedMonth])

  const selectedTotal = categoryBreakdown.reduce((s, c) => s + c.value, 0)

  const shiftMonth = (dir: -1 | 1) => {
    const next = monthlyTotals[monthIndex + dir]
    if (next) setSelectedMonth(next.month)
  }

  return (
    <Card title="Spending History">
      <div style={{ height: 100 }} className="mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyTotals} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="12%">
            <YAxis hide domain={[0, 'dataMax']} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={{ ...CHART_AXIS_TICK, fontSize: 9.5 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="total" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {monthlyTotals.map(m => (
                <Cell
                  key={m.month}
                  fill={m.month === selectedMonth ? 'var(--accent)' : 'var(--border-strong)'}
                  cursor="pointer"
                  onClick={() => setSelectedMonth(m.month)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shiftMonth(-1)} disabled={!canGoBack} aria-label="Previous month"
          className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-primary disabled:opacity-30 disabled:hover:text-fg-tertiary transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-fg-primary">{monthLabel(selectedMonth)}</span>
        <button onClick={() => shiftMonth(1)} disabled={!canGoForward} aria-label="Next month"
          className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-primary disabled:opacity-30 disabled:hover:text-fg-tertiary transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Design's "{month} spend by category" + running-total header —
          separates the trend chart above from the category breakdown below. */}
      <div className="flex items-baseline justify-between mt-4 mb-3.5 pt-3.5 border-t border-surface-3">
        <p className="text-[13px] font-bold text-fg-primary">{monthLabel(selectedMonth)} spend by category</p>
        <p className="text-[13px] text-fg-secondary">{fmt(selectedTotal)}</p>
      </div>

      {categoryBreakdown.length === 0 ? (
        <p className="text-sm text-fg-quaternary text-center py-6">No expenses logged this month</p>
      ) : (
        <div className="flex items-center gap-6 flex-wrap">
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* isAnimationActive=false: recharts 3's Pie entry animation never
                    resolves under this ssr:false dynamic-import mount — sectors exist
                    in the DOM (recharts-pie-sector groups) but their <path> never
                    paints, leaving an empty donut. Disabling animation renders the
                    final state immediately instead of an animated transition into it. */}
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={0} outerRadius={64} paddingAngle={0} strokeWidth={0} isAnimationActive={false}>
                  {categoryBreakdown.map(c => <Cell key={c.name} fill={FINANCE_CATEGORY_CHART_COLOR[c.name] ?? FINANCE_CATEGORY_CHART_FALLBACK} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 min-w-[140px] space-y-2">
            {categoryBreakdown.slice(0, 6).map(c => {
              const pct = selectedTotal > 0 ? (c.value / selectedTotal) * 100 : 0
              return (
                <li key={c.name} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-[9px] h-[9px] rounded-[3px] shrink-0" style={{ background: FINANCE_CATEGORY_CHART_COLOR[c.name] ?? FINANCE_CATEGORY_CHART_FALLBACK }} />
                  <span className="flex-1 text-fg-secondary truncate">{c.name}</span>
                  <span className="text-fg-secondary tabular-nums shrink-0">{fmt(c.value)}</span>
                  <span className="text-fg-tertiary tabular-nums shrink-0 w-8 text-right">{pct.toFixed(0)}%</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}
