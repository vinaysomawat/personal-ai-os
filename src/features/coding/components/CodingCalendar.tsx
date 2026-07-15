'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDay } from '../daily-core'

const STATUS_COLOR: Record<CalendarDay['status'], string> = {
  solved: 'bg-green-500/80 text-white',
  partial: 'bg-amber-500/60 text-white',
  missed: 'bg-red-500/30 text-red-200',
  none: 'bg-surface-2 text-slate-600',
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export default function CodingCalendar({ days }: { days: CalendarDay[] }) {
  const byDate = new Map(days.map(d => [d.date, d.status]))
  const sortedDates = [...days.map(d => d.date)].sort()
  const oldest = sortedDates[0]
  const newest = sortedDates[sortedDates.length - 1]

  const [cursor, setCursor] = useState(() => {
    const d = new Date(newest + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  if (days.length === 0) return null

  const monthStart = new Date(cursor.year, cursor.month, 1)
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const leadPad = monthStart.getDay()

  const cells: (string | null)[] = [...Array(leadPad).fill(null)]
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${cursor.year}-${pad2(cursor.month + 1)}-${pad2(day)}`)
  }

  const cursorMonthStr = `${cursor.year}-${pad2(cursor.month + 1)}`
  const canGoPrev = cursorMonthStr > oldest.slice(0, 7)
  const canGoNext = cursorMonthStr < newest.slice(0, 7)

  const goPrev = () => setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })
  const goNext = () => setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={goPrev} disabled={!canGoPrev} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium text-slate-300">{monthLabel}</p>
        <button onClick={goNext} disabled={!canGoNext} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d, i) => <div key={i} className="text-center text-xs text-slate-600 pb-1">{d}</div>)}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />
          const status = byDate.get(dateStr) ?? 'none'
          const dayNum = parseInt(dateStr.slice(-2), 10)
          return (
            <div key={i} title={`${dateStr}: ${status}`}
              className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium ${STATUS_COLOR[status]}`}>
              {dayNum}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Solved</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/70 inline-block" /> Partial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 inline-block" /> Missed</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface-3 inline-block" /> No assignment</span>
      </div>
    </div>
  )
}
