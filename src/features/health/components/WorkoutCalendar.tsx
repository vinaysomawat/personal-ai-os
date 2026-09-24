'use client'

import { useMemo, useState } from 'react'
import { todayIST } from '@/lib/date'
import type { WorkoutCalendarDay } from '../actions'

const STATUS_BG: Record<WorkoutCalendarDay['status'], string> = {
  done: 'bg-good',
  rest: 'bg-border',
  none: 'bg-border',
}
const STATUS_LABEL: Record<WorkoutCalendarDay['status'], string> = {
  done: 'Workout logged', rest: 'Rest', none: 'No activity',
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Same GitHub-style heatmap as Coding's CodingCalendar.tsx, but judged per
// week, not per day: non-workout days are neutral "Rest", and each Sun–Sat
// row ends with an x/N count against the profile's weekly plan (green once
// met, red for a finished week that fell short). Layout restyled 2026-08-18
// to match the Claude Design source: stats text sits in a left column beside
// the day-grid (horizontal split), not stacked above it. The current streak
// comes in from computeWorkoutStats so it matches the Daily Workout card.
export default function WorkoutCalendar({ days, title, currentStreak, weeklyPlan }: {
  days: WorkoutCalendarDay[]; title: string; currentStreak: number; weeklyPlan: number | null
}) {
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

  const monthStatuses = cells.map(c => ({ date: c.date, status: dayByDate.get(c.date)?.status ?? 'none', isFuture: c.date > today }))
  let bestStreak = 0, runningStreak = 0
  for (const c of monthStatuses) {
    if (c.status === 'done') { runningStreak++; bestStreak = Math.max(bestStreak, runningStreak) }
    else if (!c.isFuture) { runningStreak = 0 }
  }
  const doneDays = monthStatuses.filter(c => c.status === 'done').length

  // One entry per grid row (Sun–Sat). Counts span the full week, including
  // days in the adjacent month, so a week straddling a month boundary is
  // judged on all 7 days.
  const weekCount = Math.ceil((leadingBlanks + daysInMonth) / 7)
  const weeks = Array.from({ length: weekCount }, (_, r) => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(viewYear, viewMonth, 1 - leadingBlanks + r * 7 + i)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })
    const done = dates.filter(d => dayByDate.get(d)?.status === 'done').length
    const finished = dates[6] < today
    const started = dates[0] <= today
    return { done, finished, started }
  })
  const finishedWeeks = weeks.filter(w => w.finished)
  const weeksOnPlan = weeklyPlan ? finishedWeeks.filter(w => w.done >= weeklyPlan).length : 0
  const weekColor = (w: typeof weeks[number]) =>
    !weeklyPlan ? 'text-fg-tertiary' : w.done >= weeklyPlan ? 'text-good' : w.finished ? 'text-risk' : 'text-fg-tertiary'

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
          <p className="text-[14px] font-semibold text-fg-primary leading-[1.4]">🔥 {currentStreak}d streak · {bestStreak} best this month</p>
          {weeklyPlan && finishedWeeks.length > 0 && (
            <p className="text-[13px] text-fg-secondary leading-[1.4]">
              <span className={`font-semibold ${weeksOnPlan === finishedWeeks.length ? 'text-good' : 'text-fg-primary'}`}>{weeksOnPlan}/{finishedWeeks.length}</span> finished weeks on plan ({weeklyPlan}/wk)
            </p>
          )}
          <p className="text-[13px] text-fg-secondary leading-[1.4]"><span className="text-good font-semibold">{doneDays}</span> workout days this month</p>
          {selectedDate && selectedDay && (
            <div className="bg-surface-2 rounded-[8px] px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-semibold text-fg-primary">
                  {monthLabel.split(' ')[0]} {Number(selectedDate.slice(-2))}
                </p>
                <p className="text-[11px] text-fg-tertiary">{STATUS_LABEL[selectedDay.status]}</p>
              </div>
              {selectedDay.workouts.length > 0 ? (
                <ul className="flex flex-col gap-1 mt-1.5">
                  {selectedDay.workouts.map((w, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11.5px]">
                      <span className="flex-1 min-w-0 truncate text-fg-secondary">{w.type}</span>
                      {w.durationMinutes != null && <span className="text-fg-tertiary shrink-0">{w.durationMinutes} min</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11.5px] text-fg-tertiary mt-1">No workout logged this day.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-1 shrink-0 mx-auto">
          <div className="grid gap-[4px] mb-[4px]" style={{ gridTemplateColumns: 'repeat(7, 20px) 26px' }}>
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-center text-[9px] font-semibold text-fg-tertiary">{w}</div>
            ))}
            <div className="text-center text-[9px] font-semibold text-fg-tertiary">Wk</div>
          </div>
          <div className="grid gap-[4px]" style={{ gridTemplateColumns: 'repeat(7, 20px) 26px' }}>
            {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`blank-${i}`} style={{ width: 20, height: 20 }} />)}
            {cells.flatMap(({ date }, idx) => {
              const isFuture = date > today
              const status = dayByDate.get(date)?.status ?? 'none'
              const isToday = date === today
              const isSelected = date === selectedDate
              const cell = (
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
              // After each Saturday (or the month's last day), close the row
              // with that week's x/N count.
              const pos = leadingBlanks + idx
              const rowEnds = pos % 7 === 6 || idx === cells.length - 1
              if (!rowEnds) return [cell]
              const row = Math.floor(pos / 7)
              const w = weeks[row]
              const fillers = Array.from({ length: 6 - (pos % 7) }).map((_, i) => <div key={`tail-${i}`} style={{ width: 20, height: 20 }} />)
              return [cell, ...fillers, (
                <div key={`wk-${row}`} className={`h-5 flex items-center justify-center text-[10px] font-semibold tabular-nums ${weekColor(w)}`} title={weeklyPlan ? `${w.done} of ${weeklyPlan} planned workouts this week` : `${w.done} workouts this week`}>
                  {w.started ? (weeklyPlan ? `${w.done}/${weeklyPlan}` : w.done) : ''}
                </div>
              )]
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2.5 border-t border-surface-3 text-[10.5px] text-fg-tertiary flex-wrap justify-center">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-good inline-block" />Done</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-[3px] bg-border inline-block" />Rest</span>
        {weeklyPlan && <span>Wk = workouts vs {weeklyPlan}/wk plan</span>}
      </div>
    </div>
  )
}
