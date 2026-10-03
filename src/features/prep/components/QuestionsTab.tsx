'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Target } from 'lucide-react'
import Card from '@/components/Card'
import { modalInputClass, modalSaveButtonClass, modalCancelButtonClass } from '@/components/Modal'
import { gradeQuestion, savePrepSettings } from '../actions'
import { BANK_CATEGORIES, type BankCategory, type CategoryCoverage, type CategoryQuota } from '../hunt'
import type { BankQuestion, PrepSession, PrepSettings, QuestionStatus } from '../types'

const DIFFICULTY_ORDER: Record<string, number> = { medium: 0, easy: 1, hard: 2 }

const GRADES: { status: QuestionStatus; label: string; hint: string; cls: string }[] = [
  { status: 'missed', label: 'Missed', hint: 'couldn\'t answer', cls: 'border-risk-border text-risk hover:bg-risk-soft' },
  { status: 'partial', label: 'Partial', hint: 'gaps or slow', cls: 'border-border-strong text-warn hover:bg-warn-soft' },
  { status: 'confident', label: 'Confident', hint: 'interview-ready', cls: 'border-border-strong text-good hover:bg-good-soft' },
]

const isQuota = (c: CategoryCoverage | CategoryQuota): c is CategoryQuota => 'quota' in c

// Unseen first (coverage is the goal before the target date), medium →
// easy → hard; then questions graded partial/missed, oldest first.
function buildQueue(bank: BankQuestion[], category: string, topic: string): BankQuestion[] {
  const qs = bank.filter(q => q.category === category && (!topic || q.topics.includes(topic)))
  const unseen = qs.filter(q => !q.status).sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1) || a.title.localeCompare(b.title))
  const review = qs.filter(q => q.status === 'partial' || q.status === 'missed').sort((a, b) => (a.last_seen_at ?? '').localeCompare(b.last_seen_at ?? ''))
  return [...unseen, ...review]
}

export function QuestionsTab({ bank: initialBank, coverage, category: categoryParam, onCategoryChange, today, onGraded }: {
  bank: BankQuestion[]
  coverage: (CategoryCoverage | CategoryQuota)[]
  category: string | null
  onCategoryChange: (key: BankCategory) => void
  today: string
  onGraded: (session: PrepSession | null) => void
}) {
  const [bank, setBank] = useState(initialBank)
  const [doneToday, setDoneToday] = useState<Record<string, number>>(() => Object.fromEntries(coverage.map(c => [c.key, c.doneToday])))
  const category: BankCategory = BANK_CATEGORIES.some(c => c.key === categoryParam) ? categoryParam as BankCategory : 'quiz'
  const setCategory = onCategoryChange
  const [topic, setTopic] = useState('')
  const [answer, setAnswer] = useState('')
  const [opened, setOpened] = useState(false)
  const [, startTransition] = useTransition()

  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const q of bank) if (q.category === category) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [bank, category])
  // A topic picked under another category doesn't apply here.
  const activeTopic = topics.some(([t]) => t === topic) ? topic : ''
  const queue = useMemo(() => buildQueue(bank, category, activeTopic), [bank, category, activeTopic])
  const current = queue[0] ?? null

  const stats = (key: string) => {
    const qs = bank.filter(q => q.category === key)
    return {
      total: qs.length,
      seen: qs.filter(q => q.status).length,
      confident: qs.filter(q => q.status === 'confident').length,
      review: qs.filter(q => q.status === 'partial' || q.status === 'missed').length,
    }
  }
  const totals = BANK_CATEGORIES.reduce((acc, c) => { const s = stats(c.key); return { seen: acc.seen + s.seen, total: acc.total + s.total } }, { seen: 0, total: 0 })

  const grade = (status: QuestionStatus) => {
    if (!current) return
    const id = current.id
    const text = answer.trim() || null
    setBank(prev => prev.map(q => q.id === id ? { ...q, status, last_seen_at: new Date().toISOString() } : q))
    setDoneToday(prev => ({ ...prev, [category]: (prev[category] ?? 0) + 1 }))
    setAnswer('')
    setOpened(false)
    startTransition(async () => onGraded(await gradeQuestion(id, status, text)))
  }

  const quotaFor = (key: string) => { const c = coverage.find(x => x.key === key); return c && isQuota(c) ? c : null }
  const q = quotaFor(category)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[var(--grid-gap)] items-start">
      <Card title="Sprint" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{q ? `${doneToday[category] ?? 0}/${q.quota} today · ` : `${doneToday[category] ?? 0} today · `}{queue.length} in queue</span>}>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {BANK_CATEGORIES.map(c => {
            const cq = quotaFor(c.key)
            const met = cq && cq.quota > 0 && (doneToday[c.key] ?? 0) >= cq.quota
            return (
              <button key={c.key} onClick={() => { setCategory(c.key); setTopic(''); setOpened(false); setAnswer('') }} aria-pressed={category === c.key}
                className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${category === c.key ? 'bg-accent-soft border-accent text-accent' : met ? 'bg-good-soft border-good/40 text-good' : 'border-border-strong text-fg-secondary hover:bg-surface-2'}`}>
                {met ? '✓ ' : ''}{c.label}{cq ? ` · ${doneToday[c.key] ?? 0}/${cq.quota}` : ''}
              </button>
            )
          })}
        </div>
        <select value={activeTopic} onChange={e => { setTopic(e.target.value); setOpened(false) }} aria-label="Topic"
          className="w-full bg-surface-2 border border-surface-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-fg-primary outline-none mb-3">
          <option value="">All topics</option>
          {topics.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
        </select>

        {!current ? (
          <div className="text-center py-8">
            <p className="text-[22px] mb-1.5">✅</p>
            <p className="text-[13px] text-fg-secondary">Every question here is graded confident. Pick another category or topic.</p>
          </div>
        ) : (
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1.5">
              {current.status ? `Review · last ${current.status}` : 'New'} · {current.difficulty}{current.topics.length ? ` · ${current.topics.join(', ')}` : ''}
            </p>
            <p className="text-[15px] font-semibold text-fg-primary leading-snug">{current.title}</p>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={category === 'quiz' ? 4 : 3}
              placeholder={category === 'quiz' ? 'Answer out loud first, then jot the key points (optional — saved on the flashcard if you miss it)' : 'Approach / complexity / trade-offs (optional)'}
              className="mt-3 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
            <div className="flex items-center justify-between gap-2 mt-2">
              {current.url ? (
                <a href={current.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}
                  className="text-[12px] text-accent hover:underline inline-flex items-center gap-1">
                  {category === 'quiz' ? 'Check the answer' : 'Open the problem'} <ExternalLink size={11} />
                </a>
              ) : <span />}
              <button onClick={() => { setOpened(false); setAnswer(''); setBank(prev => [...prev.filter(x => x.id !== current.id), current]) }} className="text-[11.5px] text-fg-tertiary hover:text-fg-secondary">Skip for now</button>
            </div>
            <div className={`grid grid-cols-3 gap-2 mt-3 ${opened || category !== 'quiz' ? '' : 'opacity-80'}`}>
              {GRADES.map(g => (
                <button key={g.status} onClick={() => grade(g.status)} className={`rounded-[8px] border py-2 text-[12.5px] font-semibold transition-colors ${g.cls}`}>
                  {g.label}
                  <span className="block text-[10.5px] font-normal text-fg-tertiary">{g.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-fg-tertiary mt-2">Partial and missed questions become flashcards, so they come back before your interview.</p>
          </div>
        )}
      </Card>

      <Card title="Coverage" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{totals.seen}/{totals.total} seen</span>}>
        <ul className="flex flex-col gap-2.5">
          {BANK_CATEGORIES.map(c => {
            const s = stats(c.key)
            const cq = quotaFor(c.key)
            return (
              <li key={c.key}>
                <button onClick={() => setCategory(c.key)} className="w-full text-left">
                  <div className="flex items-baseline justify-between text-[12.5px] gap-2">
                    <span className="font-medium text-fg-primary">{c.label}</span>
                    <span className="text-[11px] text-fg-tertiary tabular-nums">{s.seen}/{s.total} · <span className="text-good">{s.confident}✓</span> · <span className="text-warn">{s.review} review</span></span>
                  </div>
                  <div className="h-[5px] rounded-[3px] bg-border mt-1 flex overflow-hidden">
                    <div className="h-full bg-good" style={{ width: `${s.total ? (s.confident / s.total) * 100 : 0}%` }} />
                    <div className="h-full bg-warn" style={{ width: `${s.total ? (s.review / s.total) * 100 : 0}%` }} />
                  </div>
                  {cq && <p className="text-[10.5px] text-fg-tertiary mt-0.5 tabular-nums">{cq.quota}/day · ~{cq.projectedSeen}/{s.total} seen by target ({s.total ? Math.round((cq.projectedSeen / s.total) * 100) : 0}%)</p>}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="text-[10.5px] text-fg-tertiary mt-3">Includes questions completed in Coding. Today: {today}.</p>
      </Card>
    </div>
  )
}

// Job Hunt Mode toggle — a target date + daily hours that turn Today's Prep
// into a full-day plan with per-category question quotas.
export function HuntModeCard({ settings, daysLeft, coverage }: { settings: PrepSettings; daysLeft: number | null; coverage: (CategoryCoverage | CategoryQuota)[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(settings.target_date ?? '')
  const [hours, setHours] = useState(settings.hours_per_day)
  const [busy, startTransition] = useTransition()
  const on = settings.target_date !== null && daysLeft !== null
  const quotas = coverage.filter(isQuota)
  const perDay = quotas.reduce((s, c) => s + c.quota, 0)

  const save = (targetDate: string | null) => startTransition(async () => {
    await savePrepSettings(targetDate, hours)
    setEditing(false)
    router.refresh()
  })

  if (on && !editing) {
    return (
      <Card padding="p-[var(--card-pad-sm)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-primary"><Target size={14} className="text-accent" /> Job Hunt Mode</span>
          <span className="text-[12px] text-fg-secondary tabular-nums"><span className="font-semibold text-accent">D-{daysLeft}</span> to {settings.target_date} · {settings.hours_per_day}h/day · {perDay} questions/day</span>
          <span className="text-[11.5px] text-fg-tertiary tabular-nums">{quotas.map(c => `${c.label} ${c.quota}`).join(' · ')}</span>
          <button onClick={() => setEditing(true)} className="ml-auto text-[11.5px] text-accent hover:underline">Edit</button>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); if (date) save(date) }}>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-primary mr-1"><Target size={14} className="text-accent" /> Job Hunt Mode</span>
        <label className="text-[11.5px] text-fg-tertiary">Interview-ready by</label>
        <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required className={`${modalInputClass()} !w-auto`} />
        <label className="text-[11.5px] text-fg-tertiary">Hours/day</label>
        <input type="number" min={1} max={14} value={hours} onChange={e => setHours(Number(e.target.value))} className={`${modalInputClass()} !w-[64px]`} />
        <button type="submit" disabled={busy || !date} className={modalSaveButtonClass}>{busy ? 'Saving…' : on ? 'Update plan' : 'Start'}</button>
        {on && <button type="button" onClick={() => setEditing(false)} className={modalCancelButtonClass}>Cancel</button>}
        {on && <button type="button" disabled={busy} onClick={() => save(null)} className="text-[11.5px] text-fg-tertiary hover:text-risk ml-auto">Turn off</button>}
        {!on && <span className="text-[11.5px] text-fg-tertiary basis-full sm:basis-auto">Turns Today&apos;s Prep into a full-day plan with daily question quotas.</span>}
      </form>
    </Card>
  )
}
