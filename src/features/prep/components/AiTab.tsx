'use client'

import { useState, useTransition } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import Card from '@/components/Card'
import Modal, { modalCancelButtonClass, modalInputClass, modalLabelClass, modalSaveButtonClass } from '@/components/Modal'
import { AI_TOPIC_STAGE, BUILD_START, PROJECT, ROADMAP, STAGES, nextStep, roadmapWeek, type RoadmapProgress, type RoadmapStepDone, type RoadmapWeek } from '../roadmap'
import { saveRoadmapWeek, setRoadmapStep, undoRoadmapWeek } from '../actions'
import type { BankQuestion } from '../types'
import { guard } from '@/lib/guard'

// AI Engineer tab: the guided path (roadmap.ts) — today's step with its
// concept, the week's concepts / steps / interview line, the 4-stage path
// with step ticks and shipped weeks, and mastery per AI topic by stage.
// All deterministic — no AI.

const DAY = 86400000
const weekStart = (week: number) => new Date(new Date(`${BUILD_START}T00:00:00Z`).getTime() + (week - 1) * 7 * DAY)
const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekRange = (week: number) => `${fmt(weekStart(week))}–${fmt(new Date(weekStart(week).getTime() + 6 * DAY))}`
const ratingCls = (r: number) => r >= 7 ? 'bg-good-soft text-good' : r >= 5 ? 'bg-warn-soft text-warn' : 'bg-risk-soft text-risk'

function Links({ links }: { links: RoadmapWeek['links'] }) {
  return links.length ? (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {links.map(l => <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline"><ExternalLink size={11} /> {l.label}</a>)}
    </div>
  ) : null
}

export function AiTab({ today, progress, setProgress, steps: initialSteps, bank, onOpenTopic }: {
  today: string
  progress: RoadmapProgress[]
  setProgress: (fn: (prev: RoadmapProgress[]) => RoadmapProgress[]) => void
  steps: RoadmapStepDone[]
  bank: BankQuestion[]
  onOpenTopic: (category: string, topic: string) => void
}) {
  // 0 = before the start, ROADMAP.length + 1 = finished.
  const current = roadmapWeek(today)?.week ?? (today < BUILD_START ? 0 : ROADMAP.length + 1)
  const active = ROADMAP[Math.min(Math.max(current, 1), ROADMAP.length) - 1]
  const [view, setView] = useState(active.week)
  const [steps, setSteps] = useState(initialSteps)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()
  const shipped = new Map(progress.map(p => [p.week, p]))
  const isDone = (week: number, step: number) => steps.some(d => d.week === week && d.step === step)
  const doneIn = (week: number) => steps.filter(d => d.week === week).length
  const week = ROADMAP[view - 1]
  const next = nextStep(active, steps)
  const stage = active.stage

  const toggle = (w: number, s: number) => {
    const done = !isDone(w, s)
    const prev = steps
    setSteps(p => done ? [...p, { week: w, step: s, done_at: new Date().toISOString() }] : p.filter(d => !(d.week === w && d.step === s)))
    startTransition(guard(async () => {
      try { setSteps(await setRoadmapStep(w, s, done)) } catch { setSteps(prev) }
    }))
  }
  const save = (w: number, input: { proof_url: string; metric: string; notes: string }) => {
    setError(null)
    startTransition(guard(async () => {
      try {
        const row = await saveRoadmapWeek(w, input)
        setProgress(prev => [...prev.filter(p => p.week !== w), row].sort((a, b) => a.week - b.week))
        setEditing(null)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not save') }
    }))
  }
  const undo = (w: number) => {
    const prev = progress
    setProgress(p => p.filter(x => x.week !== w))
    startTransition(guard(async () => { try { await undoRoadmapWeek(w) } catch { setProgress(() => prev) } }))
  }

  // Mastery per AI-engineering topic, by stage: this stage and earlier first
  // (weakest first), later stages dimmed.
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
  const mastery = [...topics.entries()].map(([topic, r]) => ({
    topic, ...r, stage: AI_TOPIC_STAGE[topic] ?? 4,
    avg: r.ratings.length ? Math.round((r.ratings.reduce((s, x) => s + x, 0) / r.ratings.length) * 10) / 10 : null,
  })).sort((a, b) => a.stage - b.stage || (a.avg ?? 0) - (b.avg ?? 0))

  const step = next === null ? null : active.steps[next]
  const concept = step ? active.concepts[step.concept] : null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[var(--grid-gap)] items-start">
      <div className="space-y-[var(--grid-gap)] min-w-0">
        <Card title="Today's step" action={<span className="text-[11px] text-fg-tertiary tabular-nums">
          {current === 0 ? `starts ${fmt(weekStart(1))}` : current > ROADMAP.length ? 'path finished' : `W${active.week} · stage ${stage} · ${doneIn(active.week)}/5 steps`}
        </span>}>
          {step && concept ? (
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-accent uppercase tracking-wide">Step {next! + 1} of 5 · {PROJECT.name}</p>
                <p className="text-[14px] font-semibold text-fg-primary">{step.title}</p>
                <p className="text-[12.5px] text-fg-secondary mt-0.5">{step.task}.</p>
                <p className="text-[12px] text-fg-primary mt-1"><span className="font-semibold text-good">Done when</span> {step.doneWhen}.</p>
              </div>
              <div className="rounded-[9px] bg-accent-soft border border-accent/30 px-2.5 py-1.5">
                <p className="text-[12px]"><span className="font-semibold text-accent">Learn first · {concept.term}</span> <span className="text-fg-secondary">— {concept.plain}</span></p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Links links={active.links} />
                <button onClick={() => toggle(active.week, next!)} disabled={busy}
                  className={`${modalSaveButtonClass} !py-[5px] inline-flex items-center gap-1 disabled:opacity-50`}><Check size={13} strokeWidth={3} /> Mark step done</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] text-fg-secondary">All 5 steps of W{active.week} are done — write the README section, push it and mark the week shipped.</p>
              {!shipped.has(active.week) && <button onClick={() => { setError(null); setEditing(active.week) }} className={`${modalSaveButtonClass} !py-[5px]`}>Mark week shipped</button>}
            </div>
          )}
        </Card>

        <Card title={`W${week.week} · ${week.title}`} action={<span className="text-[11px] text-fg-tertiary tabular-nums">{weekRange(week.week)}{week.week === active.week && current >= 1 ? ' · this week' : ''}</span>}>
          <p className="text-[12.5px] text-fg-primary">{week.goal}.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 items-start">
            <div>
              <p className="text-[11px] font-semibold text-fg-tertiary uppercase tracking-wide mb-1">Concepts</p>
              <dl className="flex flex-col gap-1">
                {week.concepts.map(c => (
                  <div key={c.term} className="text-[12px] leading-snug"><dt className="inline font-semibold text-fg-primary">{c.term}</dt> <dd className="inline text-fg-secondary">— {c.plain}</dd></div>
                ))}
              </dl>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-fg-tertiary uppercase tracking-wide mb-1">Steps</p>
              <ol className="flex flex-col gap-1">
                {week.steps.map((s, i) => {
                  const d = isDone(week.week, i)
                  return (
                    <li key={i}>
                      <label className={`flex items-start gap-2 rounded-[8px] px-1.5 py-1 cursor-pointer ${d ? 'bg-good-soft' : 'bg-surface-2'}`}>
                        <input type="checkbox" checked={d} onChange={() => toggle(week.week, i)} disabled={busy} className="mt-[3px] shrink-0" />
                        <span className="min-w-0">
                          <span className={`block text-[12px] font-semibold ${d ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{i + 1}. {s.title}</span>
                          <span className="block text-[11px] text-fg-tertiary">Done when {s.doneWhen}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
          <p className="text-[12px] text-fg-secondary mt-2.5 border-l-2 border-accent pl-2 italic">“{week.interviewLine}”</p>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
            <div className="flex flex-wrap gap-1.5">
              {week.theme.topics.map(t => (
                <button key={t} onClick={() => onOpenTopic(week.theme.category, t)} className="text-[11.5px] rounded-full px-2 py-[2px] bg-accent-soft border border-accent/40 text-accent hover:underline">{t} questions →</button>
              ))}
            </div>
            {view <= Math.max(current, 1) && (
              <span className="flex items-center gap-2">
                {shipped.get(view)?.proof_url && <a href={shipped.get(view)!.proof_url!} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-accent hover:underline inline-flex items-center gap-1"><ExternalLink size={11} /> proof</a>}
                {shipped.get(view)?.metric && <span className="text-[11px] rounded-full px-2 py-[1px] bg-good-soft text-good font-semibold">{shipped.get(view)!.metric}</span>}
                <button onClick={() => { setError(null); setEditing(view) }} className="text-[11.5px] font-semibold text-accent hover:underline">{shipped.has(view) ? 'Edit' : 'Mark week shipped'}</button>
                {shipped.has(view) && <button onClick={() => undo(view)} disabled={busy} className="text-[11px] text-fg-tertiary hover:text-risk disabled:opacity-40">Undo</button>}
              </span>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-[var(--grid-gap)]">
        <Card title="The path" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{shipped.size}/{ROADMAP.length} shipped · {steps.length}/{ROADMAP.length * 5} steps</span>}>
          <p className="text-[11.5px] text-fg-secondary mb-2"><span className="font-semibold text-fg-primary">{PROJECT.name}</span> — {PROJECT.pitch}. A fresh repo you write yourself.</p>
          <div className="flex flex-col gap-2">
            {STAGES.map(st => (
              <div key={st.stage}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${st.stage === stage && current >= 1 ? 'text-accent' : 'text-fg-tertiary'}`}>Stage {st.stage} · {st.title}</p>
                <ol className="flex flex-col gap-0.5 mt-0.5">
                  {ROADMAP.filter(w => w.stage === st.stage).map(w => {
                    const p = shipped.get(w.week)
                    const n = doneIn(w.week)
                    const isNow = w.week === current
                    return (
                      <li key={w.week}>
                        <button onClick={() => setView(w.week)} className={`w-full flex items-center gap-2 rounded-[8px] px-1.5 py-1 text-left ${view === w.week ? 'ring-1 ring-accent/60' : ''} ${p ? 'bg-good-soft' : isNow ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
                          <span className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${p ? 'bg-good border-good text-on-good' : isNow ? 'border-accent text-accent' : !p && w.week < current ? 'border-warn text-warn' : 'border-border-strong text-fg-tertiary'}`}>
                            {p ? <Check size={11} strokeWidth={3} /> : w.week}
                          </span>
                          <span className="flex-1 min-w-0 text-[12px] font-semibold text-fg-primary truncate">{w.title}</span>
                          <span className="text-[10.5px] text-fg-tertiary tabular-nums shrink-0">{n}/5 · {fmt(weekStart(w.week))}</span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI topic mastery" action={<span className="text-[11px] text-fg-tertiary">by stage · answered · avg</span>}>
          <ul className="flex flex-col gap-1">
            {mastery.map(m => (
              <li key={m.topic}>
                <button onClick={() => onOpenTopic('ai-engineering', m.topic)} className={`w-full text-left rounded-[8px] px-2 py-1 hover:bg-surface-2 ${m.stage > stage ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[12px] truncate ${active.theme.topics.includes(m.topic) ? 'font-bold text-accent' : 'text-fg-primary'}`}><span className="text-fg-tertiary font-normal tabular-nums">S{m.stage}</span> {m.topic}</span>
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
        <WeekModal week={editing} initial={shipped.get(editing) ?? null} busy={busy} error={error}
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
        <p className="text-[12px] text-fg-secondary">{w.goal}.</p>
        <div>
          <label className={modalLabelClass}>Proof link (PR, commit or demo)</label>
          <input type="url" value={f.proof_url} onChange={e => setF({ ...f, proof_url: e.target.value })} placeholder="https://github.com/…/job-copilot" className={modalInputClass()} />
        </div>
        <div>
          <label className={modalLabelClass}>Key number</label>
          <input value={f.metric} onChange={e => setF({ ...f, metric: e.target.value })} placeholder="e.g. recall@5 0.82 · p95 1.2s · $0.002/answer" className={modalInputClass()} />
        </div>
        <div>
          <label className={modalLabelClass}>Notes (what you&apos;d say in an interview)</label>
          <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} rows={3} placeholder={w.interviewLine} className={`${modalInputClass()} resize-y`} />
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
