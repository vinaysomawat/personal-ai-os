'use client'

import type { CalendarDay } from '../daily-core'

const STATUS_COLOR: Record<CalendarDay['status'], string> = {
  solved: 'bg-green-500',
  partial: 'bg-amber-500/70',
  missed: 'bg-red-500/40',
  none: 'bg-surface-3',
}

export default function CodingCalendar({ days }: { days: CalendarDay[] }) {
  if (days.length === 0) return null

  const firstDate = new Date(days[0].date + 'T00:00:00')
  const padCount = firstDate.getDay()
  const padded: (CalendarDay | null)[] = [...Array(padCount).fill(null), ...days]

  const weeks: (CalendarDay | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1" style={{ minWidth: `${weeks.length * 14}px` }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day ? `${day.date}: ${day.status}` : ''}
                  className={`w-3 h-3 rounded-sm ${day ? STATUS_COLOR[day.status] : 'bg-transparent'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Solved</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/70 inline-block" /> Partial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/40 inline-block" /> Missed</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-surface-3 inline-block" /> No assignment</span>
      </div>
    </div>
  )
}
