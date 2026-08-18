'use client'

import { useMemo, useState } from 'react'
import { todayIST } from '@/lib/date'
import type { CalendarDay } from '../daily-core'

const STATUS_BG: Record<CalendarDay['status'], string> = {
  solved: 'bg-good',
  partial: 'bg-warn',
  missed: 'bg-risk',
  none: 'bg-border',
}
const STATUS_LABEL: Record<CalendarDay['status'], string> = {
  solved: 'Solved', partial: 'Partially completed', missed: 'Missed', none: 'No activity',
}
const ACTIVE_STATUSES: CalendarDay['status'][] = ['solved', 'partial']
const DIFFICULTY_CHIP: Record<string, string> = {
  easy: 'bg-good-soft text-good',
  medium: 'bg-warn-soft text-warn',
  hard: 'bg-risk-soft text-risk',
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// GitHub-style contribution heatmap (blank colored squares, no day numbers —
// today/selected shown via a ring instead), sized up from the design's literal
// 16px spec so the card doesn't leave dead space next to Today's Question,
// and enriched with per-day question detail (title/difficulty/completion)
// on click — real data already computed by computeCodingCalendar, no new
// query. Navigation is bounded to whatever date range `days` (up to 182
// days) actually covers.
//
// Layout restyled 2026-08-18 to match the Claude Design source: the streak/
// active-rate/status-count text sits in a left column beside the day-grid
// (horizontal split), not stacked above it — same pattern applied to
// Learning/Health/Finance's calendars for consistency.
export default function CodingCalendar({ days }: { days: CalendarDay[] }) {
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

  // Current/best streak + active-day rate, scoped to the visible month —
  // "active" means solved or partial. Future days are skipped without
  // breaking a streak (not yet resolved either way).
  const monthStatuses = cells.map(c => ({ date: c.date, status: dayByDate.get(c.date)?.status ?? 'none', isFuture: c.date > today }))
  let bestStreak = 0, runningStreak = 0
  for (const c of monthStatuses) {
    if (ACTIVE_STATUSES.includes(c.status)) { runningStreak++; bestStreak = Math.max(bestStreak, runningStreak) }
    else if (!c.isFuture) { runningStreak = 0 }
  }
  let currentStreak = 0
  for (let i = monthStatuses.length - 1; i >= 0; i--) {
    const c = monthStatuses[i]
    if (c.isFuture) continue
    if (ACTIVE_STATUSES.includes(c.status)) currentStreak++
    else break
  }
  const trackedDays = monthStatuses.filter(c => !c.isFuture)
  const activeDaysCount = trackedDays.filter(c => ACTIVE_STATUSES.includes(c.status)).length
  const activeRate = trackedDays.length > 0 ? Math.round((activeDaysCount / trackedDays.length) * 100) : 0
  const monthCounts = trackedDays.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {} as Partial<Record<CalendarDay['status'], number>>)

  const selectedDay = selectedDate ? dayByDate.get(selectedDate) : null

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex flex-col justify-start gap-2.5 flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-fg-primary leading-[1.4]">🔥 {currentStreak} current · {bestStreak} best streak</p>
          <p className="text-[13px] text-fg-secondary leading-[1.4]">{activeRate}% active this month</p>
          <p className="text-[13px] text-fg-secondary leading-[1.4]">
            <span className="text-good font-semibold">{monthCounts.solved ?? 0} solved</span> · <span className="text-warn font-semibold">{monthCounts.partial ?? 0} partial</span> · <span className="text-risk font-semibold">{monthCounts.missed ?? 0} missed</span> this month
          </p>
          {selectedDate && selectedDay && (
            <div className="bg-surface-2 rounded-[8px] px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-semibold text-fg-primary">
                  {monthLabel.split(' ')[0]} {Number(selectedDate.slice(-2))}
                </p>
                <p className="text-[11px] text-fg-tertiary">{STATUS_LABEL[selectedDay.status]}</p>
              </div>
              {selectedDay.questions.length > 0 ? (
                <ul className="flex flex-col gap-1 mt-1.5">
                  {selectedDay.questions.map((q, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11.5px]">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] shrink-0 ${DIFFICULTY_CHIP[q.difficulty]}`}>{q.difficulty}</span>
                      <span className={`flex-1 min-w-0 truncate ${q.completed ? 'text-fg-secondary' : 'text-fg-tertiary'}`}>{q.title}</span>
                      <span className={q.completed ? 'text-good' : 'text-fg-quaternary'}>{q.completed ? '✓' : '○'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-fg-quaternary mt-1">No question assigned this day.</p>
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
              const isFuture = date > today
              const status = dayByDate.get(date)?.status ?? 'none'
              const isToday = date === today
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  title={isFuture ? '' : `${date}: ${STATUS_LABEL[status]}`}
                  disabled={isFuture}
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  style={{ width: 20, height: 20 }}
                  className={`rounded-[4px] box-border transition-transform hover:scale-110
                    ${isFuture ? 'border border-dashed border-border cursor-default' : `${STATUS_BG[status]} cursor-pointer`}
                    ${isSelected ? 'ring-2 ring-fg-primary' : isToday ? 'ring-[1.5px] ring-accent' : ''}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2.5 border-t border-surface-3 text-[10.5px] text-fg-tertiary flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-good inline-block" />Solved</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-warn inline-block" />Partial</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-risk inline-block" />Missed</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-border inline-block" />None</span>
      </div>
    </div>
  )
}
