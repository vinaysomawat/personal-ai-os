'use client'

import { useMemo, useState, useTransition } from 'react'
import { ExternalLink, Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import { modalSaveButtonClass } from '@/components/Modal'
import { todayIST, toISTDateStr } from '@/lib/date'
import { reviewMockRound } from '../actions'
import { BANK_CATEGORIES } from '../hunt'
import { formatOf, type MockItem, type MockRound } from '../mock'

export const categoryLabel = (c: string) => c === 'star' ? 'STAR story' : BANK_CATEGORIES.find(b => b.key === c)?.label ?? c
export const mmss = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, '0')}`
export const answeredOf = (items: MockItem[]) => items.filter(i => !i.skipped).length

const VERDICT_CLS: Record<string, string> = { Strong: 'text-good', Good: 'text-accent', 'Needs work': 'text-warn' }
// 1–10 rating → color: 8+ strong, 6–7 okay, below 6 needs work.
const rateCls = (n: number) => n >= 8 ? 'text-good bg-good-soft' : n >= 6 ? 'text-warn bg-warn-soft' : 'text-risk bg-risk-soft'
const scoreText = (n: number) => n >= 8 ? 'text-good' : n >= 6 ? 'text-warn' : 'text-risk'
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

// One finished round: every question with your answer, its key points and
// reference link, and the round's single AI review (overall verdict on top,
// a note under each answer). Used right after a round and from the calendar.
export function RoundDetail({ round, saving = false, onReviewed, action }: {
  round: MockRound
  // True while the just-finished round is still being saved (no id yet).
  saving?: boolean
  onReviewed: (round: MockRound) => void
  action?: React.ReactNode
}) {
  const [reviewing, startReview] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const review = round.review
  const typed = round.items.some(i => !i.skipped && i.answer.trim())
  const total = round.items.reduce((s, i) => s + i.seconds, 0)

  const runReview = () => {
    setError(null)
    startReview(async () => {
      const res = await reviewMockRound(round.id)
      if (res.review) onReviewed({ ...round, review: res.review })
      else setError(res.error)
    })
  }

  return (
    <Card title={`${formatOf(round.format).label} · ${toISTDateStr(round.created_at)} ${timeLabel(round.created_at)}`}
      action={<span className="text-[11px] text-fg-tertiary tabular-nums">{answeredOf(round.items)}/{round.items.length} answered · {mmss(total)}{saving ? ' · saving…' : ''}</span>}>
      {review ? (
        <div className="rounded-[10px] bg-accent-soft border border-accent/30 px-3 py-2.5 mb-2.5">
          <p className="text-[13px] font-semibold text-fg-primary">
            {review.score !== null && review.score !== undefined && <span className={`mr-2 tabular-nums ${scoreText(review.score)}`}>{review.score}/10</span>}
            <Sparkles size={13} className="inline -mt-0.5 mr-1 text-accent" />
            <span className={VERDICT_CLS[review.verdict] ?? 'text-fg-primary'}>{review.verdict}</span>
            {review.outcome && <span className="text-fg-secondary font-normal"> · {review.outcome}</span>}
          </p>
          {review.summary && <p className="text-[12.5px] text-fg-secondary mt-1 leading-relaxed">{review.summary}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
            {review.strengths.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-good">What worked</p>
                <ul className="text-[12px] text-fg-secondary list-disc pl-4 mt-0.5">{review.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {review.fixes.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-warn">Fix next</p>
                <ol className="text-[12px] text-fg-secondary list-decimal pl-4 mt-0.5">{review.fixes.map((x, i) => <li key={i}>{x}</li>)}</ol>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <p className="text-[11.5px] text-fg-tertiary">{typed ? 'One AI interviewer review covers every answer in this round.' : 'No typed answers — type the gist next time to get an AI review.'}</p>
          <button onClick={runReview} disabled={!typed || saving || reviewing || !round.id} className={`${modalSaveButtonClass} inline-flex items-center gap-1.5 !py-[7px]`}>
            <Sparkles size={13} /> {reviewing ? 'Reviewing all answers…' : 'AI review of this round'}
          </button>
          {error && <p className="basis-full text-[12px] text-risk">{error}</p>}
          {reviewing && <div className="basis-full space-y-2">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {round.items.map((it, idx) => (
          <li key={idx} className="rounded-[10px] bg-surface-2 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary">{idx + 1}. {categoryLabel(it.category)}{it.skipped ? ' · skipped' : ''}</p>
              <span className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] tabular-nums ${it.seconds > it.budget_seconds ? 'text-risk' : 'text-fg-tertiary'}`}>{mmss(it.seconds)} / {mmss(it.budget_seconds)}</span>
                {typeof review?.ratings?.[idx] === 'number' && <span className={`text-[11px] font-bold tabular-nums rounded-[5px] px-1.5 py-[1px] ${rateCls(review.ratings[idx]!)}`}>{review.ratings[idx]}/10</span>}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-fg-primary leading-snug mt-0.5">{it.prompt}</p>
            {!it.skipped && <p className={`text-[12.5px] whitespace-pre-wrap mt-1.5 ${it.answer.trim() ? 'text-fg-secondary' : 'text-fg-tertiary italic'}`}>{it.answer.trim() || 'Answered out loud'}</p>}
            {it.hints && <p className="text-[12px] text-fg-secondary mt-1.5 border-l-2 border-border-strong pl-2"><span className="font-semibold">Cover:</span> {it.hints}</p>}
            {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 text-[12px] text-accent hover:underline inline-flex items-center gap-1">Check the answer <ExternalLink size={11} /></a>}
            {review?.notes[idx] && <p className="mt-1.5 text-[12.5px] text-fg-secondary leading-relaxed border-l-2 border-accent/50 pl-2"><Sparkles size={11} className="inline -mt-0.5 mr-1 text-accent" />{review.notes[idx]}</p>}
          </li>
        ))}
      </ol>
      {action && <div className="flex justify-end mt-3">{action}</div>}
    </Card>
  )
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const pad = (n: number) => String(n).padStart(2, '0')

// Month grid of every Mock Round taken (IST dates). A day with rounds shows
// a dot per round (filled = AI-reviewed); picking a day lists its rounds,
// and opening one shows the full RoundDetail below the setup row.
export function MockCalendar({ rounds, selectedId, onSelect }: {
  rounds: MockRound[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const today = todayIST()
  const byDate = useMemo(() => {
    const m = new Map<string, MockRound[]>()
    for (const r of rounds) { const d = toISTDateStr(r.created_at); m.set(d, [...(m.get(d) ?? []), r]) }
    return m
  }, [rounds])
  const [view, setView] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const [picked, setDay] = useState<string | null>(null)
  // Defaults to the open round's day, else the latest round's.
  const fallback = rounds.find(r => r.id === selectedId) ?? rounds[0]
  const day = picked ?? (fallback ? toISTDateStr(fallback.created_at) : null)

  const first = new Date(view.y, view.m, 1)
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const monthKey = `${view.y}-${pad(view.m + 1)}`
  const monthRounds = rounds.filter(r => toISTDateStr(r.created_at).startsWith(monthKey))
  const reviewed = rounds.filter(r => r.review).length
  const earliest = rounds.length ? toISTDateStr(rounds[rounds.length - 1].created_at).slice(0, 7) : monthKey
  const shift = (d: number) => setView(v => { const n = new Date(v.y, v.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() } })
  const dayRounds = day ? byDate.get(day) ?? [] : []

  return (
    <Card title="Mock Interview Calendar" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{rounds.length} round{rounds.length === 1 ? '' : 's'} · {reviewed} reviewed</span>}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shift(-1)} disabled={monthKey <= earliest} aria-label="Previous month"
          className="w-[26px] h-[26px] rounded-[6px] border border-border-strong text-fg-secondary disabled:opacity-30 hover:bg-surface-2">‹</button>
        <p className="text-[12px] text-fg-secondary font-medium">{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · {monthRounds.length} round{monthRounds.length === 1 ? '' : 's'}</p>
        <button onClick={() => shift(1)} disabled={monthKey >= today.slice(0, 7)} aria-label="Next month"
          className="w-[26px] h-[26px] rounded-[6px] border border-border-strong text-fg-secondary disabled:opacity-30 hover:bg-surface-2">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => <span key={i} className="text-[10px] text-fg-quaternary">{w}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${monthKey}-${pad(i + 1)}`
          const rs = byDate.get(date) ?? []
          return (
            <button key={date} onClick={() => setDay(date)} disabled={rs.length === 0} aria-pressed={day === date} aria-label={`${date}: ${rs.length} rounds`}
              className={`h-[34px] rounded-[6px] flex flex-col items-center justify-center text-[11px] tabular-nums transition-colors ${day === date ? 'bg-accent-soft border border-accent text-accent' : rs.length ? 'bg-surface-2 text-fg-primary hover:bg-surface-3' : 'text-fg-quaternary'} ${date === today ? 'font-bold' : ''}`}>
              {i + 1}
              {rs.length > 0 && (
                <span className="flex gap-[2px] mt-[2px]">
                  {rs.slice(0, 4).map(r => <span key={r.id} className={`w-[5px] h-[5px] rounded-full ${r.review ? 'bg-accent' : 'border border-accent'}`} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {rounds.length === 0 ? (
        <p className="text-[12px] text-fg-tertiary text-center pt-3">No rounds yet. Every round you take is kept here with your answers and its AI review.</p>
      ) : (
        <ul className="flex flex-col gap-1 mt-2.5 pt-2.5 border-t border-surface-3">
          {dayRounds.length === 0 && <li className="text-[11.5px] text-fg-tertiary">Pick a day with a dot.</li>}
          {dayRounds.map(r => (
            <li key={r.id}>
              <button onClick={() => onSelect(r.id)} aria-pressed={selectedId === r.id}
                className={`w-full text-left rounded-md px-1.5 -mx-1.5 py-1 transition-colors ${selectedId === r.id ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="text-fg-primary font-medium truncate">{formatOf(r.format).label}</span>
                  <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{timeLabel(r.created_at)} · {Math.round(r.duration_seconds / 60)}m · {answeredOf(r.items)}/{r.items.length}</span>
                </div>
                <p className={`text-[11px] ${r.review ? VERDICT_CLS[r.review.verdict] ?? 'text-fg-secondary' : 'text-fg-tertiary'}`}>{r.review ? `${r.review.score != null ? `${r.review.score}/10 · ` : ''}${r.review.verdict} · ${r.review.outcome}` : 'Not reviewed yet'}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
