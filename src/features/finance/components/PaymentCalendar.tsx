'use client'

import { useMemo, useState } from 'react'
import { todayIST } from '@/lib/date'
import type { PaymentCalendarDay } from '../actions'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

// Redesigned 2026-08-20 (Recurring Expenses removed entirely) — a plain
// day-by-day expense log: "logged" if >=1 expense was recorded that day,
// "none" otherwise. No streak/active-rate stats, unlike Coding/Learning/
// Health's calendars — those track a daily habit worth being consistent
// at, but spending money isn't something to keep a streak on, so a "none"
// day isn't a miss. Same GitHub-style heatmap shape as those calendars for
// visual consistency, just a 2-state legend instead of 3-4.
export default function PaymentCalendar({ days, title }: { days: PaymentCalendarDay[]; title: string }) {
  const dayByDate = useMemo(() => new Map(days.map(d => [d.date, d])), [days])
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
  // Built from the local y/m/d components directly, not via
  // `.toISOString()` — that converts to UTC first, which silently shifts
  // the date back a day for any timezone ahead of UTC (e.g. IST), throwing
  // off which weekday column "today" and every other cell land in.
  const pad = (n: number) => String(n).padStart(2, '0')
  const monthStartStr = `${viewYear}-${pad(viewMonth + 1)}-01`
  const monthEndStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(monthEnd.getDate())}`
  const canGoPrev = monthStartStr > minDate
  const canGoNext = monthEndStr < maxDate

  const daysInMonth = monthEnd.getDate()
  const leadingBlanks = monthStart.getDay()
  const cells: { num: number; date: string }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`
    cells.push({ num: d, date })
  }

  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else { setViewMonth(m => m - 1) }
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else { setViewMonth(m => m + 1) }
  }

  const monthDays = cells.map(c => dayByDate.get(c.date)).filter((d): d is PaymentCalendarDay => !!d)
  const loggedDays = monthDays.filter(d => d.status === 'logged')
  const activeRate = monthDays.length > 0 ? Math.round((loggedDays.length / monthDays.length) * 100) : 0
  const monthTotal = loggedDays.reduce((s, d) => s + d.expenses.reduce((es, e) => es + e.amount, 0), 0)

  const selectedDay = selectedDate ? dayByDate.get(selectedDate) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-fg-primary">{title}</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={goPrev} disabled={!canGoPrev} aria-label="Previous month"
            className="w-[26px] h-[26px] rounded-[6px] border border-border-strong text-fg-secondary disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-2 transition-colors">
            ‹
          </button>
          <p className="text-[12px] text-fg-secondary min-w-[92px] text-center font-medium">{monthLabel}</p>
          <button onClick={goNext} disabled={!canGoNext} aria-label="Next month"
            className="w-[26px] h-[26px] rounded-[6px] border border-border-strong text-fg-secondary disabled:opacity-30 disabled:pointer-events-none hover:bg-surface-2 transition-colors">
            ›
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex flex-col justify-start gap-2.5 flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-fg-primary leading-[1.4]">{fmt(monthTotal)} spent this month</p>
          <p className="text-[13px] text-fg-secondary leading-[1.4]">{activeRate}% of days had an expense logged</p>
          <p className="text-[13px] text-fg-secondary leading-[1.4]">
            <span className="text-good font-semibold">{loggedDays.length} logged</span> · <span className="text-fg-tertiary font-semibold">{monthDays.length - loggedDays.length} none</span> this month
          </p>
          {selectedDate && selectedDay && (
            <div className="bg-surface-2 rounded-[8px] px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-semibold text-fg-primary">
                  {monthLabel.split(' ')[0]} {Number(selectedDate.slice(-2))}
                </p>
              </div>
              {selectedDay.expenses.length > 0 ? (
                <ul className="flex flex-col gap-1 mt-1.5">
                  {selectedDay.expenses.map((e, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11.5px]">
                      <span className="flex-1 min-w-0 truncate text-fg-secondary">{e.description || e.category} · {e.category}</span>
                      <span className="text-fg-tertiary shrink-0">{fmt(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-fg-quaternary mt-1">No expenses logged this day.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-1 shrink-0 mx-auto">
          <div className="grid gap-[4px] mb-[4px]" style={{ gridTemplateColumns: 'repeat(7, 20px)' }}>
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-[9px] font-semibold text-fg-tertiary">{w}</div>
            ))}
          </div>
          <div className="grid gap-[4px]" style={{ gridTemplateColumns: 'repeat(7, 20px)' }}>
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} style={{ width: 20, height: 20 }} />)}
            {cells.map(({ date }) => {
              const day = dayByDate.get(date)
              const isLogged = day?.status === 'logged'
              const isToday = date === today
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  title={isLogged ? `${date}: ${day!.expenses.length} expense(s)` : `${date}: no expenses logged`}
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  style={{ width: 20, height: 20 }}
                  className={`rounded-[4px] box-border transition-transform hover:scale-110 cursor-pointer
                    ${isLogged ? 'bg-good' : 'border border-dashed border-border'}
                    ${isSelected ? 'ring-2 ring-fg-primary' : isToday ? 'ring-[1.5px] ring-accent' : ''}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2.5 border-t border-surface-3 text-[10.5px] text-fg-tertiary flex-wrap justify-center">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-good inline-block" />Logged</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-border inline-block" />None</span>
      </div>
    </div>
  )
}
