'use client'

import { useState, useTransition } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import Card from '@/components/Card'
import Modal, { modalCancelButtonClass, modalInputClass, modalLabelClass, modalSaveButtonClass } from '@/components/Modal'
import { BUILD_START, ROADMAP, THEMES, roadmapWeek, type RoadmapProgress } from '../roadmap'
import { saveRoadmapWeek, undoRoadmapWeek } from '../actions'
import type { BankQuestion } from '../types'

// AI Engineer tab: the 11-week Build roadmap with proof per shipped week,
// this week's theme, and mastery per AI-engineering topic. All
// deterministic — no AI.

const DAY = 86400000
const weekStart = (week: number) => new Date(new Date(`${BUILD_START}T00:00:00Z`).getTime() + (week - 1) * 7 * DAY)
const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekRange = (week: number) => `${fmt(weekStart(week))}–${fmt(new Date(weekStart(week).getTime() + 6 * DAY))}`
const ratingCls = (r: number) => r >= 7 ? 'bg-good-soft text-good' : r >= 5 ? 'bg-warn-soft text-warn' : 'bg-risk-soft text-risk'

export function AiTab({ today, progress, setProgress, bank, onOpenTopic }: {
  today: string
  progress: RoadmapProgress[]
  setProgress: (fn: (prev: RoadmapProgress[]) => RoadmapProgress[]) => void
  bank: BankQuestion[]
  onOpenTopic: (category: string, topic: string) => void
}) {
  const current = roadmapWeek(today)?.week ?? (today < BUILD_START ? 0 : 14)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const done = new Map(progress.map(p => [p.week, p]))
  const theme = THEMES[current]
  const week = ROADMAP.find(w => w.week === current) ?? null

  // Mastery per AI-engineering topic: answered / total and average rating.
  // This week's topics first, then weakest (unrated counts as 0).
  const topics = new Map<string, { total: number; seen: number; ratings: number[] }>()
  for (const q of bank) {
    if (q.category !== 'ai-engineering') continue
    for (const t of q.topics) {
      if (t === 'Must-have') continue
      const row = topics.get(t) ?? { total: 0, seen: 0, ratings: [] }
      row.total++
      if (q.last_seen_at) row.seen++
      if (q.last_rating !== null) row.ratings.push(q.last_rating)
      topics.set(t, row)
    }
  }
  const themeTopics = theme?.category === 'ai-engineering' ? theme.topics : []
  const mastery = [...topics.entries()].map(([topic, r]) => ({
    topic, ...r, avg: r.ratings.length ? Math.round((r.ratings.reduce((s, x) => s + x, 0) / r.ratings.length) * 10) / 10 : null,
  })).sort((a, b) => Number(themeTopics.includes(b.topic)) - Number(themeTopics.includes(a.topic)) || (a.avg ?? 0) - (b.avg ?? 0))

  const save = (w: number, input: { proof_url: string; metric: string; notes: string }) => {
    setError(null)
    startTransition(async () => {
      try {
        const row = await saveRoadmapWeek(w, input)
        setProgress(prev => [...prev.filter(p => p.week !== w), row].sort((a, b) => a.week - b.week))
        setEditing(null)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not save') }
    })
  }
  const undo = (w: number) => {
    const prev = progress
    setProgress(p => p.filter(x => x.week !== w))
    startTransition(async () => { try { await undoRoadmapWeek(w) } catch { setProgress(() => prev) } })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[var(--grid-gap)] items-start">
      <Card title={`Roadmap · ${current >= 1 && current <= ROADMAP.length ? `week ${current} of ${ROADMAP.length}` : current === 0 ? 'starts soon' : 'finished'}`}
        action={<span className="text-[11px] text-fg-tertiary tabular-nums">{done.size}/{ROADMAP.length} shipped · {[...done.values()].filter(p => p.proof_url).length} with proof</span>}>
        <div className="h-[5px] rounded-[3px] bg-border mb-2.5">
          <div className="h-full rounded-[3px] bg-good transition-all" style={{ width: `${(done.size / ROADMAP.length) * 100}%` }} />
        </div>
        <ol className="flex flex-col gap-1">
          {ROADMAP.map(w => {
            const p = done.get(w.week)
            const isNow = w.week === current
            const missed = !p && w.week < current
            return (
              <li key={w.week} className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-1.5 ${p ? 'bg-good-soft' : isNow ? 'bg-accent-soft' : 'bg-surface-2'}`}>
                <span aria-label={p ? 'Shipped' : isNow ? 'This week' : missed ? 'Not shipped' : 'Upcoming'}
                  className={`mt-0.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${p ? 'bg-good border-good text-on-good' : isNow ? 'border-accent text-accent' : missed ? 'border-warn text-warn' : 'border-border-strong text-fg-tertiary'}`}>
                  {p ? <Check size={11} strokeWidth={3} /> : w.week}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-fg-primary">W{w.week} · {w.title}{isNow && <span className="text-accent font-bold"> ● this week</span>}</p>
                    <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{weekRange(w.week)}</span>
                  </div>
                  <p className="text-[11.5px] text-fg-secondary mt-0.5">{w.milestone}</p>
                  {p ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {p.proof_url && <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-accent hover:underline max-w-full truncate"><ExternalLink size={11} className="shrink-0" /><span className="truncate">{p.proof_url.replace(/^https?:\/\//, '')}</span></a>}
                      {p.metric && <span className="text-[11px] rounded-full px-2 py-[1px] bg-surface-1 border border-good/40 text-good font-semibold">{p.metric}</span>}
                      {!p.proof_url && <span className="text-[11px] text-warn">no proof link yet</span>}
                    </div>
                  ) : (
                    <p className="text-[11px] text-fg-tertiary mt-0.5">Done when {w.doneWhen}</p>
                  )}
                </div>
                {w.week <= current && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button onClick={() => { setError(null); setEditing(w.week) }} className="text-[11.5px] font-semibold text-accent hover:underline">{p ? 'Edit' : 'Mark done'}</button>
                    {p && <button onClick={() => undo(w.week)} disabled={busy} className="text-[11px] text-fg-tertiary hover:text-risk disabled:opacity-40">Undo</button>}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </Card>

      <div className="space-y-[var(--grid-gap)]">
        <Card title="This week" action={week && <span className="text-[11px] text-fg-tertiary tabular-nums">{weekRange(week.week)}</span>}>
          {week && theme ? (
            <>
              <p className="text-[13px] font-semibold text-fg-primary">W{week.week} · {week.title}</p>
              <p className="text-[11.5px] text-fg-secondary mt-0.5">Daily: Learn → Build → themed drill on {theme.topics.length ? theme.topics.join(' + ') : 'your resume'}.</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(theme.topics.length ? theme.topics : ['']).map(t => (
                  <button key={t} onClick={() => onOpenTopic(theme.category, t)} className="text-[11.5px] rounded-full px-2 py-[2px] bg-accent-soft border border-accent/40 text-accent hover:underline">{t || 'Resume questions'} →</button>
                ))}
              </div>
              {week.links.length > 0 && (
                <ul className="mt-2.5 flex flex-col gap-1">
                  {week.links.map(l => (
                    <li key={l.href}><a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-fg-secondary hover:text-accent"><ExternalLink size={11} /> {l.label}</a></li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-[12px] text-fg-secondary">{current === 0 ? `The roadmap starts ${fmt(weekStart(1))}.` : `All ${ROADMAP.length} weeks are behind you — the daily drill now covers any AI-engineering topic.`}</p>
          )}
        </Card>

        <Card title="AI topic mastery" action={<span className="text-[11px] text-fg-tertiary">answered · avg rating</span>}>
          <ul className="flex flex-col gap-1">
            {mastery.map(m => (
              <li key={m.topic}>
                <button onClick={() => onOpenTopic('ai-engineering', m.topic)} className="w-full text-left rounded-[8px] px-2 py-1 hover:bg-surface-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[12px] truncate ${themeTopics.includes(m.topic) ? 'font-bold text-accent' : 'text-fg-primary'}`}>{m.topic}</span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-fg-tertiary tabular-nums">{m.seen}/{m.total}</span>
                      {m.avg !== null
                        ? <span className={`text-[10.5px] font-bold rounded-full px-1.5 py-[1px] tabular-nums ${ratingCls(m.avg)}`}>{m.avg}</span>
                        : <span className="text-[10.5px] text-fg-quaternary">—</span>}
                    </span>
                  </div>
                  <div className="h-[3px] rounded-[2px] bg-border mt-1">
                    <div className="h-full rounded-[2px] bg-accent" style={{ width: `${m.total ? (m.seen / m.total) * 100 : 0}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {editing !== null && (
        <WeekModal week={editing} initial={done.get(editing) ?? null} busy={busy} error={error}
          onClose={() => setEditing(null)} onSave={input => save(editing, input)} />
      )}
    </div>
  )
}

function WeekModal({ week, initial, busy, error, onClose, onSave }: {
  week: number
  initial: RoadmapProgress | null
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (input: { proof_url: string; metric: string; notes: string }) => void
}) {
  const w = ROADMAP.find(x => x.week === week)!
  const [f, setF] = useState({ proof_url: initial?.proof_url ?? '', metric: initial?.metric ?? '', notes: initial?.notes ?? '' })
  return (
    <Modal title={`W${week} · ${w.title}`} onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); onSave(f) }}>
        <p className="text-[12px] text-fg-secondary">Done when {w.doneWhen}.</p>
        <div>
          <label className={modalLabelClass}>Proof link (PR, commit or demo)</label>
          <input type="url" value={f.proof_url} onChange={e => setF({ ...f, proof_url: e.target.value })} placeholder="https://github.com/…" className={modalInputClass()} />
        </div>
        <div>
          <label className={modalLabelClass}>Key number</label>
          <input value={f.metric} onChange={e => setF({ ...f, metric: e.target.value })} placeholder="e.g. recall@5 0.82 · p95 1.2s · ₹0.40/answer" className={modalInputClass()} />
        </div>
        <div>
          <label className={modalLabelClass}>Notes (what you&apos;d say in an interview)</label>
          <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={3} className={`${modalInputClass()} resize-y`} />
        </div>
        {error && <p className="text-[12px] text-risk">{error}</p>}
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className={modalCancelButtonClass}>Cancel</button>
          <button type="submit" disabled={busy} className={modalSaveButtonClass}>{initial ? 'Save' : 'Mark shipped'}</button>
        </div>
      </form>
    </Modal>
  )
}
