'use client'

import { useMemo, useState } from 'react'
import { todayIST } from '@/lib/date'
import type { CalendarDay } from '../daily-core'

const STATUS_COLOR: Record<CalendarDay['status'], string> = {
  solved: 'bg-good',
  partial: 'bg-warn/70',
  missed: 'bg-risk/40',
  none: 'bg-surface-3',
}
const STATUS_LABEL: Record<CalendarDay['status'], string> = {
  solved: 'Solved', partial: 'Partially completed', missed: 'Missed', none: 'No assignment',
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Traditional single-month grid (day numbers, Sun-Sat header, prev/next nav)
// rather than a rolling heatmap strip — navigation is bounded to whatever
// date range `days` (up to 182 days, computeCodingCalendar) actually covers,
// since there's no data before or after that fetched window.
export default function CodingCalendar({ days }: { days: CalendarDay[] }) {
  const statusByDate = useMemo(() => new Map(days.map(d => [d.date, d.status])), [days])
  const minDate = useMemo(() => days.reduce((min, d) => (d.date < min ? d.date : min), days[0]?.date ?? ''), [days])
  const maxDate = useMemo(() => days.reduce((max, d) => (d.date > max ? d.date : max), days[0]?.date ?? ''), [days])
  const today = todayIST()

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  if (days.length === 0) return null

  const monthStart = new Date(viewYear, viewMonth, 1)
  const monthEnd = new Date(viewYear, viewMonth + 1, 0)
  const monthStartStr = monthStart.toISOString().slice(0, 10)
  const monthEndStr = monthEnd.toISOString().slice(0, 10)
  const canGoPrev = monthStartStr > minDate
  const canGoNext = monthEndStr < maxDate

  const daysInMonth = monthEnd.getDate()
  const leadingBlanks = monthStart.getDay()
  const cells: { num: number; date: string }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d).toISOString().slice(0, 10)
    cells.push({ num: d, date })
  }

  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else { setViewMonth(m => m - 1) }
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else { setViewMonth(m => m + 1) }
  }

  const monthCounts = cells.reduce((acc, c) => {
    const s = statusByDate.get(c.date)
    if (s && c.date <= today) acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {} as Partial<Record<CalendarDay['status'], number>>)

  const selectedStatus = selectedDate ? statusByDate.get(selectedDate) ?? 'none' : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2.5">
        <button onClick={goPrev} disabled={!canGoPrev} aria-label="Previous month"
          className="w-[26px] h-[26px] rounded-[6px] border border-border-strong text-fg-secondary disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-2 transition-colors">
          ‹
        </button>
        <p className="text-[12.5px] text-fg-secondary min-w-[92px] text-center">{monthLabel}</p>
        <button onClick={goNext} disabled={!canGoNext} aria-label="Next month"
          className="w-[26px] h-[26px] rounded-[6px] border border-border-strong text-fg-secondary disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-2 transition-colors">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[5px] mb-[5px]">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[10.5px] font-semibold text-fg-tertiary">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[5px]">
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} className="aspect-square" />)}
        {cells.map(({ num, date }) => {
          const isFuture = date > today
          const status = statusByDate.get(date) ?? 'none'
          const isToday = date === today
          const isSelected = date === selectedDate
          return (
            <button
              key={date}
              title={isFuture ? '' : `${date}: ${STATUS_LABEL[status]}`}
              disabled={isFuture}
              onClick={() => setSelectedDate(isSelected ? null : date)}
              className={`aspect-square rounded-[5px] flex items-center justify-center text-[10px] font-medium
                ${isFuture ? 'border border-dashed border-surface-3 text-fg-tertiary cursor-default' : `${STATUS_COLOR[status]} text-white cursor-pointer`}
                ${isSelected ? 'ring-2 ring-fg-primary' : isToday ? 'ring-[1.5px] ring-accent' : ''}`}
            >
              {num}
            </button>
          )
        })}
      </div>

      {selectedDate && selectedStatus && (
        <div className="text-xs text-fg-secondary bg-surface-2 rounded-[8px] px-3 py-2 mt-2.5">
          {monthLabel.split(' ')[0]} {Number(selectedDate.slice(-2))} — {STATUS_LABEL[selectedStatus]}
        </div>
      )}
      <p className="text-[11px] text-fg-tertiary mt-2.5">
        {monthCounts.solved ?? 0} solved · {monthCounts.partial ?? 0} partial · {monthCounts.missed ?? 0} missed this month
      </p>

      <div className="flex items-center gap-3.5 mt-3 text-[11px] text-fg-tertiary flex-wrap">
        <span>🟢 Solved</span>
        <span>🟡 Partial</span>
        <span>🔴 Missed</span>
        <span>⚪ No assignment</span>
      </div>
    </div>
  )
}
