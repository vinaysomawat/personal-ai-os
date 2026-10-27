'use client'

import { Check, Timer } from 'lucide-react'
import Card from '@/components/Card'
import { clock, hm } from '../war'
import { overHint, span, type Timeline, type TimelineRow } from '../timeline'

// Today's timeline (timeline.ts): the plan on the clock inside your day
// window, life slots between blocks, re-flowed every minute — blocks not done
// in their slot move to now and the flex slot shrinks first. Plan rows can
// start their focus timer; life rows are just time.
const LIFE: Partial<Record<TimelineRow['kind'], string>> = { break: 'text-fg-tertiary', meal: 'text-fg-secondary', walk: 'text-fg-secondary', apps: 'text-fg-secondary', flex: 'text-fg-secondary', review: 'text-fg-tertiary' }

export default function TimelineCard({ timeline, windowLabel, nowMin, activeKey, onStart }: {
  timeline: Timeline
  windowLabel: string
  // Prep minutes now (war.ts prepHourNow × 60).
  nowMin: number
  // The block a focus session is running on, if any.
  activeKey: string | null
  onStart: (key: string) => void
}) {
  const { rows, current, over, end } = timeline
  return (
    <Card title="Timeline" action={
      <span className={`text-[11px] tabular-nums ${over ? 'text-warn font-semibold' : 'text-fg-tertiary'}`}>
        {windowLabel} · ends {clock(end)}{over ? ` · ${over} min over` : ''}
      </span>
    }>
      <ol className="flex flex-col">
        {rows.map((r, i) => {
          const isNow = r === current
          const past = r.end <= nowMin && !isNow
          const block = r.kind === 'block'
          return (
            <li key={`${r.kind}${r.blockKey ?? ''}${i}`}
              className={`grid grid-cols-[50px_1fr_auto] sm:grid-cols-[124px_1fr_auto] items-center gap-2 px-2 py-[5px] rounded-[7px] text-[12px] ${isNow ? 'bg-accent-soft ring-1 ring-accent/50' : ''} ${past && !r.done ? 'opacity-55' : ''}`}>
              {/* Start only on mobile; the full range from sm up. */}
              <span className={`tabular-nums text-[11px] whitespace-nowrap ${isNow ? 'text-accent font-semibold' : 'text-fg-tertiary'}`}>
                <span className="sm:hidden">{clock(r.start)}</span><span className="hidden sm:inline">{span(r)}</span>
              </span>
              <span className={`min-w-0 truncate ${block ? (r.done ? 'text-fg-tertiary' : 'font-semibold text-fg-primary') : LIFE[r.kind] ?? ''}`}>
                {block && r.done && <Check size={11} strokeWidth={3} className="inline -mt-0.5 mr-1 text-good" />}
                {r.label}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {r.moved && <span className="text-[10.5px] font-semibold text-warn">moved</span>}
                <span className="text-[10.5px] text-fg-tertiary tabular-nums">{hm(r.end - r.start)}</span>
                {block && !r.done && r.blockKey && (isNow || r.moved || r === timeline.next) && (
                  <button onClick={() => onStart(r.blockKey!)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
                    <Timer size={11} />{activeKey === r.blockKey ? 'Go' : 'Start'}
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      {over > 0 && <p className="text-[11px] text-warn mt-1.5">The day {overHint(over)}.</p>}
    </Card>
  )
}
