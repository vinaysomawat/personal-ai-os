'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDay } from '../daily-core'

const STATUS_COLOR: Record<CalendarDay['status'], string> = {
  solved: 'bg-good',
  partial: 'bg-warn/70',
  missed: 'bg-risk/40',
  none: 'bg-surface-3',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Traditional single-month grid (day numbers, Sun-Sat header, prev/next nav)
// rather than a rolling heatmap strip — navigation is bounded to whatever
// date range `days` (up to 182 days, computeCodingCalendar) actually covers,
// since there's no data before or after that fetched window.
export default function CodingCalendar({ days }: { days: CalendarDay[] }) {
  const statusByDate = useMemo(() => new Map(days.map(d => [d.date, d.status])), [days])
  const minDate = useMemo(() => days.reduce((min, d) => (d.date < min ? d.date : min), days[0]?.date ?? ''), [days])
  const maxDate = useMemo(() => days.reduce((max, d) => (d.date > max ? d.date : max), days[0]?.date ?? ''), [days])

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

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

  return (
    <div className="max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <button onClick={goPrev} disabled={!canGoPrev} aria-label="Previous month"
          className="p-1 rounded-lg text-fg-tertiary hover:text-fg-secondary hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none transition-colors">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium text-fg-secondary">{monthLabel}</p>
        <button onClick={goNext} disabled={!canGoNext} aria-label="Next month"
          className="p-1 rounded-lg text-fg-tertiary hover:text-fg-secondary hover:bg-surface-2 disabled:opacity-30 disabled:pointer-events-none transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1 justify-items-center">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] font-semibold text-fg-quaternary">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 justify-items-center">
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} />)}
        {cells.map(({ num, date }) => {
          const status = statusByDate.get(date) ?? 'none'
          return (
            <div
              key={date}
              title={`${date}: ${status}`}
              className={`w-9 h-9 rounded-md flex items-center justify-center text-[11px] font-medium text-fg-secondary ${STATUS_COLOR[status]}`}
            >
              {num}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-fg-quaternary flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-good inline-block" /> Solved</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-warn/70 inline-block" /> Partial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-risk/40 inline-block" /> Missed</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface-3 inline-block" /> No assignment</span>
      </div>
    </div>
  )
}
