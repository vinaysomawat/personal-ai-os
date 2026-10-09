'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Sparkles, Target } from 'lucide-react'
import Card from '@/components/Card'
import { modalInputClass, modalSaveButtonClass, modalCancelButtonClass } from '@/components/Modal'
import { answerQuestion, critiqueAnswer, savePrepSettings } from '../actions'
import { BANK_CATEGORIES, type BankCategory, type CategoryCoverage, type CategoryQuota } from '../hunt'
import { toISTDateStr } from '@/lib/date'
import type { BankQuestion, PrepSession, PrepSettings } from '../types'

const DIFFICULTY_ORDER: Record<string, number> = { medium: 0, easy: 1, hard: 2 }

const isQuota = (c: CategoryCoverage | CategoryQuota): c is CategoryQuota => 'quota' in c

// Unseen first (coverage is the goal before the target date) — in the
// question's explicit sort_order when it has one (AI-native), else medium →
// easy → hard; then practiced ones, longest ago first. Skipped questions go
// to the back for this visit.
function buildQueue(bank: BankQuestion[], category: string, topic: string, skipped: string[]): BankQuestion[] {
  const qs = bank.filter(q => q.category === category && (!topic || q.topics.includes(topic)))
  const unseen = qs.filter(q => !q.last_seen_at).sort((a, b) =>
    (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
    (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1) || a.title.localeCompare(b.title))
  const review = qs.filter(q => q.last_seen_at).sort((a, b) => a.last_seen_at!.localeCompare(b.last_seen_at!))
  const queue = [...unseen, ...review]
  const skip = (q: BankQuestion) => skipped.indexOf(q.id)
  return [...queue.filter(q => skip(q) < 0), ...queue.filter(q => skip(q) >= 0).sort((a, b) => skip(a) - skip(b))]
}

const PLACEHOLDER: Record<string, string> = {
  quiz: 'Answer out loud first, then type it to get feedback (optional — saved when you hit Next)',
  'ai-native': 'Answer from real experience: the tool, the task, what the AI got wrong or right, and how YOU verified it. Saved when you hit Next.',
  angular: 'Answer out loud as if in the interview: the concept, how it works under the hood, when you use it, a trade-off or example from your Angular apps. Saved when you hit Next.',
  behavioral: 'Say it out loud first (60–120 s), then type it. Lead with the direct answer; no blame. Saved when you hit Next.',
}
// Linkless (Prep-added) questions are answered in the app: a typed answer,
// the key points on request, and AI interviewer feedback.
const VERBAL_PLACEHOLDER: Record<string, string> = {
  quiz: 'Answer out loud, then type it — the why, not just the what. Saved when you hit Next.',
  'ui-coding': 'Build it in your editor, then summarize: component API, state, keyboard + ARIA, edge cases, trade-offs.',
  'system-design': 'Outline it (Requirements → Architecture → Data model → Interface → Optimizations), then paste or summarize here.',
}

export function QuestionsTab({ bank, setBank, topic, onTopicChange: setTopic, coverage, category: categoryParam, onCategoryChange, today, onGraded }: {
  // Owned by PrepView so Mock Round answers show up here too.
  bank: BankQuestion[]
  setBank: (fn: (prev: BankQuestion[]) => BankQuestion[]) => void
  // Owned by PrepView so the War Room's revision queue can deep-link a topic.
  topic: string
  onTopicChange: (topic: string) => void
  coverage: (CategoryCoverage | CategoryQuota)[]
  category: string | null
  onCategoryChange: (key: BankCategory) => void
  today: string
  onGraded: (session: PrepSession | null) => void
}) {
  const doneToday = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const q of bank) if (q.last_seen_at && toISTDateStr(q.last_seen_at) === today) counts[q.category] = (counts[q.category] ?? 0) + 1
    return counts
  }, [bank, today])
  const category: BankCategory = BANK_CATEGORIES.some(c => c.key === categoryParam) ? categoryParam as BankCategory : 'quiz'
  const setCategory = onCategoryChange
  // Draft is per question so a review question starts from your last saved
  // answer (the AI-native answers are meant to be refined, not retyped).
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ id: string; text: string; rating: number | null } | null>(null)
  const [showHints, setShowHints] = useState(false)
  const [, startTransition] = useTransition()
  const [reviewing, startReview] = useTransition()

  const topics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const q of bank) if (q.category === category) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [bank, category])
  // A topic picked under another category doesn't apply here.
  const activeTopic = topics.some(([t]) => t === topic) ? topic : ''
  const queue = useMemo(() => buildQueue(bank, category, activeTopic, skipped), [bank, category, activeTopic, skipped])
  const current = queue[0] ?? null
  const answer = current && draft?.id === current.id ? draft.text : (current?.last_answer ?? '')
  const setAnswer = (text: string) => { if (current) setDraft({ id: current.id, text }) }
  const resetCard = () => { setDraft(null); setShowHints(false) }
  const currentFeedback = current && feedback?.id === current.id ? feedback : null
  const verbal = !!current && !current.url

  const getFeedback = () => {
    if (!current || answer.trim().length < 40) return
    const id = current.id
    const text = answer.trim()
    startReview(async () => { const r = await critiqueAnswer(id, text); setFeedback({ id, text: r.feedback, rating: r.rating }) })
  }

  const stats = (key: string) => {
    const qs = bank.filter(q => q.category === key)
    return {
      total: qs.length,
      seen: qs.filter(q => q.last_seen_at).length,
    }
  }
  const totals = BANK_CATEGORIES.reduce((acc, c) => { const s = stats(c.key); return { seen: acc.seen + s.seen, total: acc.total + s.total } }, { seen: 0, total: 0 })

  const next = () => {
    if (!current) return
    const id = current.id
    const text = answer.trim() || null
    const rating = feedback?.id === id ? feedback.rating : null
    const now = new Date().toISOString()
    setBank(prev => prev.map(q => q.id === id ? { ...q, last_seen_at: now, last_answer: text ?? q.last_answer, ...(rating !== null ? { last_rating: rating, last_rated_at: now } : {}) } : q))
    resetCard()
    startTransition(async () => onGraded(await answerQuestion(id, text, rating)))
  }
  const skip = () => { if (!current) return; resetCard(); setSkipped(prev => [...prev.filter(x => x !== current.id), current.id]) }

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
              <button key={c.key} onClick={() => { setCategory(c.key); setTopic(''); resetCard() }} aria-pressed={category === c.key}
                className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${category === c.key ? 'bg-accent-soft border-accent text-accent' : met ? 'bg-good-soft border-good/40 text-good' : 'border-border-strong text-fg-secondary hover:bg-surface-2'}`}>
                {met ? '✓ ' : ''}{c.label}{cq ? ` · ${doneToday[c.key] ?? 0}/${cq.quota}` : ''}
              </button>
            )
          })}
        </div>
        <select value={activeTopic} onChange={e => { setTopic(e.target.value); resetCard() }} aria-label="Topic"
          className="w-full bg-surface-2 border border-surface-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-fg-primary outline-none mb-3">
          <option value="">All topics</option>
          {topics.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}
        </select>

        {!current ? (
          <div className="text-center py-8">
            <p className="text-[22px] mb-1.5">✅</p>
            <p className="text-[13px] text-fg-secondary">No questions here. Pick another category or topic.</p>
          </div>
        ) : (
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1.5">
              {current.last_seen_at ? `Review · last ${toISTDateStr(current.last_seen_at).slice(5)}` : 'New'} · {current.difficulty}{current.topics.length ? ` · ${current.topics.join(', ')}` : ''}
            </p>
            <p className="text-[15px] font-semibold text-fg-primary leading-snug">{current.title}</p>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={verbal ? 7 : category === 'quiz' ? 4 : 3}
              placeholder={PLACEHOLDER[category] ?? (verbal ? VERBAL_PLACEHOLDER[category] : null) ?? 'Approach / complexity / trade-offs (optional)'}
              className="mt-3 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
            <div className="flex items-center justify-between gap-2 mt-2">
              {current.url ? (
                <a href={current.url} target="_blank" rel="noopener noreferrer"
                  className="text-[12px] text-accent hover:underline inline-flex items-center gap-1">
                  {category === 'quiz' ? 'Check the answer' : 'Open the problem'} <ExternalLink size={11} />
                </a>
              ) : current.answer_hints ? (
                <button onClick={() => setShowHints(v => !v)} className="text-[11.5px] text-accent hover:underline">{showHints ? 'Hide' : 'Show'} {category === 'quiz' ? 'key points' : category === 'ui-coding' ? 'requirements' : 'expected areas'}</button>
              ) : <span />}
              <span className="text-[11px] text-fg-tertiary tabular-nums">{answer.trim().split(/\s+/).filter(Boolean).length} words{verbal ? ' · aim for ~200' : ''}</span>
            </div>
            {showHints && current.answer_hints && <p className="text-[12px] text-fg-secondary mt-1.5">Cover: {current.answer_hints}</p>}
            {reviewing && <div className="space-y-2 mt-3">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
            {currentFeedback && !reviewing && (
              <div className="mt-3 border-l-2 border-accent/40 pl-3">
                {currentFeedback.rating !== null && (
                  <p className="mb-1"><span className={`text-[12px] font-bold tabular-nums rounded-[5px] px-1.5 py-[1px] ${currentFeedback.rating >= 8 ? 'text-good bg-good-soft' : currentFeedback.rating >= 6 ? 'text-warn bg-warn-soft' : 'text-risk bg-risk-soft'}`}>{currentFeedback.rating}/10</span></p>
                )}
                <p className="text-[13px] text-fg-secondary whitespace-pre-wrap leading-relaxed">{currentFeedback.text}</p>
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={getFeedback} disabled={reviewing || answer.trim().length < 40} title={answer.trim().length < 40 ? 'Type at least a few sentences first' : undefined}
                className={`${modalCancelButtonClass} inline-flex items-center gap-1.5 !py-[7px] !text-accent disabled:opacity-50`}>
                <Sparkles size={13} /> {reviewing ? 'Reviewing…' : 'AI review'}
              </button>
              <button onClick={skip} className={`${modalCancelButtonClass} !py-[7px] ml-auto`}>Skip</button>
              <button onClick={next} className={`${modalSaveButtonClass} !py-[7px]`}>Next →</button>
            </div>
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
                    <span className="text-[11px] text-fg-tertiary tabular-nums">{s.seen}/{s.total} · {s.total ? Math.round((s.seen / s.total) * 100) : 0}%</span>
                  </div>
                  <div className="h-[5px] rounded-[3px] bg-border mt-1 flex overflow-hidden">
                    <div className="h-full bg-good" style={{ width: `${s.total ? (s.seen / s.total) * 100 : 0}%` }} />
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
  const [outreachTarget, setOutreachTarget] = useState(settings.weekly_outreach_target)
  const [busy, startTransition] = useTransition()
  const on = settings.target_date !== null && daysLeft !== null
  const quotas = coverage.filter(isQuota)
  const perDay = quotas.reduce((s, c) => s + c.quota, 0)

  const save = (targetDate: string | null) => startTransition(async () => {
    await savePrepSettings(targetDate, hours, outreachTarget)
    setEditing(false)
    router.refresh()
  })

  if (on && !editing) {
    return (
      <Card padding="p-[var(--card-pad-sm)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-primary"><Target size={14} className="text-accent" /> Job Hunt Mode</span>
          <span className="text-[12px] text-fg-secondary tabular-nums"><span className="font-semibold text-accent">D-{daysLeft}</span> to {settings.target_date} · {settings.hours_per_day}h/day · {perDay} questions/day · outreach {settings.weekly_outreach_target}/week</span>
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
        <label className="text-[11.5px] text-fg-tertiary">Outreach/week</label>
        <input type="number" min={1} max={200} value={outreachTarget} onChange={e => setOutreachTarget(Number(e.target.value))} className={`${modalInputClass()} !w-[64px]`} />
        <button type="submit" disabled={busy || !date} className={modalSaveButtonClass}>{busy ? 'Saving…' : on ? 'Update plan' : 'Start'}</button>
        {on && <button type="button" onClick={() => setEditing(false)} className={modalCancelButtonClass}>Cancel</button>}
        {on && <button type="button" disabled={busy} onClick={() => save(null)} className="text-[11.5px] text-fg-tertiary hover:text-risk ml-auto">Turn off</button>}
        {!on && <span className="text-[11.5px] text-fg-tertiary basis-full sm:basis-auto">Turns Today&apos;s Prep into a full-day plan with daily question quotas.</span>}
      </form>
    </Card>
  )
}
