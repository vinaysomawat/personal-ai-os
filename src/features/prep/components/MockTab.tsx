'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Timer } from 'lucide-react'
import Card from '@/components/Card'
import ConfirmDialog from '@/components/ConfirmDialog'
import { modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { toISTDateStr } from '@/lib/date'
import { saveMockRound } from '../actions'
import { weakestAreas } from '../readiness'
import { MOCK_FORMATS, buildMockRound, formatMinutes, formatOf, type MockFormat, type MockItem, type MockRound } from '../mock'
import { MockCalendar, RoundDetail, categoryLabel, mmss } from './MockHistory'
import { COMPETENCIES, READINESS_AREAS, type BankQuestion, type CompetencyKey, type PrepSession, type ReadinessCell } from '../types'

// Topics the fixed Frontend-screen slots already cover — the "weakest area"
// slot draws from the rest.
const FIXED_TOPICS = new Set(['JavaScript Fundamentals', 'Async & Promises', 'Array & Object Methods', 'React & State Management', 'Next.js', 'TypeScript'])


interface Running {
  // review = finished (saved, or saving); showing answers, key points and
  // the one-click AI review.
  phase: 'running' | 'review'
  format: MockFormat
  items: MockItem[]
  idx: number
  // When the current question was shown (ms) — survives a reload.
  qStartedAt: number
  savedId?: string
}

// An in-progress round is kept in localStorage so a reload mid-round
// doesn't lose it; it's a convenience only, the saved round is the record.
const STORAGE_KEY = 'prep-mock-round-v1'
const load = (): Running | null => { try { const v = localStorage.getItem(STORAGE_KEY); return v ? JSON.parse(v) as Running : null } catch { return null } }
const store = (r: Running | null) => { try { if (r) localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); else localStorage.removeItem(STORAGE_KEY) } catch { /* private mode */ } }

export function MockTab({ bank, readiness, covered, rounds, today, format: formatParam, onFormatChange, onSaved, onRoundUpdated }: {
  bank: BankQuestion[]
  readiness: ReadinessCell[]
  covered: Set<string>
  rounds: MockRound[]
  today: string
  format: string | null
  onFormatChange: (f: MockFormat) => void
  onSaved: (round: MockRound, session: PrepSession | null) => void
  // A round gained its AI review.
  onRoundUpdated: (round: MockRound) => void
}) {
  const format: MockFormat = MOCK_FORMATS.some(f => f.key === formatParam) ? formatParam as MockFormat : 'screen'
  const [run, setRunState] = useState<Running | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [empty, setEmpty] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // The round open below the calendar.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  const setRun = (r: Running | null) => { setRunState(r); store(r) }
  useEffect(() => { const saved = load(); if (saved) setRunState(saved) }, [])
  useEffect(() => {
    if (run?.phase !== 'running') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [run?.phase])

  const weakTopics = useMemo(() => weakestAreas(readiness, READINESS_AREAS.length)
    .flatMap(c => READINESS_AREAS.find(a => a.key === c.key)?.codingTopics ?? [])
    .filter(t => !FIXED_TOPICS.has(t)).slice(0, 4), [readiness])

  const start = () => {
    const competencyOrder = [...COMPETENCIES.filter(c => !covered.has(c.key)), ...COMPETENCIES.filter(c => covered.has(c.key))].map(c => c.key as CompetencyKey)
    const items = buildMockRound(format, bank, { today, weakTopics, competencyOrder, roundsSoFar: rounds.length })
    if (items.length === 0) { setEmpty(true); return }
    setEmpty(false)
    setSaveError(null)
    setNow(Date.now())
    setRun({ phase: 'running', format, items, idx: 0, qStartedAt: Date.now() })
  }

  // Saved as soon as the last question is done — the review screen is for
  // reading the key points and the one-click AI review.
  const save = (r: Running) => {
    setSaveError(null)
    startSave(async () => {
      try {
        const { round, session } = await saveMockRound(r.format, r.items, r.items.reduce((s, i) => s + i.seconds, 0))
        setSelectedId(round.id)
        onSaved(round, session)
        setRun({ ...r, savedId: round.id })
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save the round')
      }
    })
  }

  // ---------------- Running ----------------
  if (run?.phase === 'running') {
    const item = run.items[run.idx]
    const spent = item.seconds + Math.max(0, Math.round((now - run.qStartedAt) / 1000))
    const left = item.budget_seconds - spent
    const last = run.idx === run.items.length - 1
    const setAnswer = (answer: string) => setRun({ ...run, items: run.items.map((x, i) => i === run.idx ? { ...x, answer } : x) })
    const next = (skipped: boolean) => {
      const items = run.items.map((x, i) => i === run.idx ? { ...x, seconds: spent, skipped } : x)
      if (!last) { setRun({ ...run, items, idx: run.idx + 1, qStartedAt: Date.now() }); return }
      const done: Running = { ...run, items, phase: 'review' }
      setRun(done)
      save(done)
    }
    const words = item.answer.trim().split(/\s+/).filter(Boolean).length
    return (
      <Card title={`${formatOf(run.format).label} · Q${run.idx + 1}/${run.items.length}`}
        action={<button onClick={() => setConfirmQuit(true)} className="text-[11.5px] text-fg-tertiary hover:text-risk">Quit round</button>}>
        <div className="flex gap-1 mb-3">
          {run.items.map((_, i) => <div key={i} className={`h-[4px] flex-1 rounded-[2px] ${i < run.idx ? 'bg-good' : i === run.idx ? 'bg-accent' : 'bg-border'}`} />)}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1">{categoryLabel(item.category)}</p>
            <p className="text-[15px] font-semibold text-fg-primary leading-snug">{item.prompt}</p>
          </div>
          <div className={`shrink-0 text-right tabular-nums ${left < 0 ? 'text-risk' : left < 60 ? 'text-warn' : 'text-fg-primary'}`}>
            <p className="text-[20px] font-bold leading-none inline-flex items-center gap-1"><Timer size={15} />{mmss(left)}</p>
            <p className="text-[10.5px] text-fg-tertiary mt-1">{left < 0 ? 'over time' : `of ${mmss(item.budget_seconds)}`}</p>
          </div>
        </div>
        {run.format === 'machine-coding' && (
          <div className="mt-2 text-[12.5px] text-fg-secondary">
            {item.url
              ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Open the problem spec ↗</a>
              : item.hints && <p><span className="font-semibold text-fg-primary">Requirements:</span> {item.hints}</p>}
            <p className="text-[11.5px] text-fg-tertiary mt-0.5">Build it in your editor (vanilla JS or React), then summarize below: component API, state, keyboard + ARIA, edge cases, trade-offs.</p>
          </div>
        )}
        <textarea value={item.answer} onChange={e => setAnswer(e.target.value)} rows={run.format === 'system-design' || run.format === 'machine-coding' ? 12 : 7} autoFocus
          placeholder={run.format === 'system-design'
            ? 'Requirements → Architecture → Data model → Interface (API) → Optimizations (perf, a11y, i18n, offline). Talk it through as you write.'
            : run.format === 'machine-coding'
            ? 'Paste your key code or summarize your solution: structure, state, events, a11y, what you would do with more time.'
            : 'Say it out loud as if they\'re listening, then type the gist — or leave blank if you answered out loud.'}
          className="mt-3 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-[11px] text-fg-tertiary tabular-nums">{words} words · no notes, no hints until you finish</span>
          <div className="flex gap-2">
            <button onClick={() => next(true)} className={`${modalCancelButtonClass} !py-[7px]`}>Skip</button>
            <button onClick={() => next(false)} className={`${modalSaveButtonClass} !py-[7px]`}>{last ? 'Finish' : 'Next →'}</button>
          </div>
        </div>
        {confirmQuit && (
          <ConfirmDialog title="Quit this round?" description="Your answers so far won't be saved." confirmLabel="Quit"
            onCancel={() => setConfirmQuit(false)} onConfirm={() => { setConfirmQuit(false); setRun(null) }} />
        )}
      </Card>
    )
  }

  // ---------------- Review ----------------
  if (run?.phase === 'review') {
    const saved = rounds.find(r => r.id === run.savedId)
    const round: MockRound = saved ?? { id: '', format: run.format, items: run.items, duration_seconds: run.items.reduce((s, i) => s + i.seconds, 0), created_at: new Date().toISOString(), review: null }
    return (
      <div className="space-y-2">
        {saveError && (
          <p className="text-[12px] text-risk">{saveError} — <button onClick={() => save(run)} className="underline">retry</button></p>
        )}
        <RoundDetail round={round} saving={saving} onReviewed={onRoundUpdated}
          action={<button onClick={() => setRun(null)} disabled={saving || (!run.savedId && !saveError)} className={modalSaveButtonClass}>Done</button>} />
      </div>
    )
  }

  // ---------------- Setup + history ----------------
  const lastByFormat = (f: string) => rounds.find(r => r.format === f)
  const selected = rounds.find(r => r.id === selectedId) ?? null
  return (
    <div className="space-y-[var(--grid-gap)]">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[var(--grid-gap)] items-start">
      <Card title="Mock Round" action={<span className="text-[11px] text-fg-tertiary">timed · no notes · AI review after</span>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {MOCK_FORMATS.map(f => {
            const last = lastByFormat(f.key)
            return (
              <button key={f.key} onClick={() => { onFormatChange(f.key); setEmpty(false) }} aria-pressed={format === f.key}
                className={`text-left rounded-[10px] border px-3 py-2.5 transition-colors ${format === f.key ? 'bg-accent-soft border-accent' : 'border-border-strong hover:bg-surface-2'}`}>
                <p className={`text-[13px] font-semibold ${format === f.key ? 'text-accent' : 'text-fg-primary'}`}>{f.label}</p>
                <p className="text-[11.5px] text-fg-secondary mt-0.5 leading-snug">{f.detail}</p>
                <p className="text-[11px] text-fg-tertiary mt-1 tabular-nums">
                  {f.slots.length} question{f.slots.length === 1 ? '' : 's'} · {formatMinutes(f.key)} min
                  {last && <> · last {toISTDateStr(last.created_at).slice(5)}</>}
                </p>
              </button>
            )
          })}
        </div>
        <ul className="text-[12px] text-fg-secondary mt-3 flex flex-col gap-0.5 list-disc pl-4">
          <li>Unseen questions first, then the ones you practiced longest ago{format === 'screen' && weakTopics.length ? <> — the 4th theory slot targets <span className="font-semibold">{weakTopics.slice(0, 2).join(', ')}</span></> : null}.</li>
          <li>Each question has a time budget. Answer out loud; typing the gist is optional. Skip what you can&apos;t answer.</li>
          <li>Key points and reference links appear after the last question, with one AI review for the whole round. Every round stays in the calendar.</li>
        </ul>
        {empty && <p className="text-[12px] text-warn mt-2">Nothing left to pick for this format today — try another format.</p>}
        <button onClick={start} className={`${modalSaveButtonClass} w-full mt-3`}>Start {formatOf(format).label.toLowerCase()} · {formatMinutes(format)} min</button>
      </Card>

      <MockCalendar rounds={rounds} selectedId={selectedId} onSelect={id => setSelectedId(selectedId === id ? null : id)} />
    </div>
    {selected && (
      <RoundDetail round={selected} onReviewed={onRoundUpdated}
        action={<button onClick={() => setSelectedId(null)} className={modalCancelButtonClass}>Close</button>} />
    )}
    </div>
  )
}
