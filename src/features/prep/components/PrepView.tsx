'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Layers, MessageSquareQuote, Plus, Shuffle, Sparkles, Trash2 } from 'lucide-react'
import Card from '@/components/Card'
import PageTabs from '@/components/PageTabs'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import Modal, { modalLabelClass, modalInputClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { READINESS_CONFIG, type ReadinessTier } from '@/features/career/types'
import { useEscapeKey } from '@/lib/use-escape-key'
import { scheduleReview, intervalLabel } from '../srs'
import { overallReadiness, weakestAreas } from '../readiness'
import { togglePrepBlock, reviewFlashcard, addFlashcard, deleteFlashcard, saveStory, deleteStory, rehearseStory, type StoryInput } from '../actions'
import { COMPETENCIES, REHEARSAL_PROMPTS, type CompetencyKey, type Flashcard, type PrepSession, type ReadinessCell, type ReviewGrade, type Story, type StoryRehearsal } from '../types'

export type PrepTab = 'today' | 'flashcards' | 'stories'
const TABS: { key: PrepTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'stories', label: 'Story Bank' },
]

interface Props {
  initialTab: PrepTab
  today: string
  session: PrepSession | null
  streak: number
  sessionsLast7: number
  flashcards: Flashcard[]
  reviewedToday: number
  stories: Story[]
  rehearsals: StoryRehearsal[]
  readiness: ReadinessCell[]
}

function tierFor(score: number | null): ReadinessTier {
  if (score === null) return 'not_started'
  return score >= 80 ? 'strong' : score >= 60 ? 'ready' : score >= 40 ? 'developing' : 'needs_work'
}

function StatTile({ label, value, sub, valueClass = 'text-fg-primary' }: { label: string; value: string | number; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)]">
      <p className="text-[11px] text-fg-tertiary uppercase">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10.5px] text-fg-quaternary mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PrepView(props: Props) {
  const [tab, setTab] = useState<PrepTab>(props.initialTab)
  const [session, setSession] = useState(props.session)
  const [cards, setCards] = useState(props.flashcards)
  const [reviewedToday, setReviewedToday] = useState(props.reviewedToday)
  const [stories, setStories] = useState(props.stories)
  const [rehearsals, setRehearsals] = useState(props.rehearsals)
  const [, startTransition] = useTransition()

  const dueCards = useMemo(() => cards.filter(c => c.due_date <= props.today), [cards, props.today])
  const overall = overallReadiness(props.readiness)
  const weakest = weakestAreas(props.readiness)
  const coveredCompetencies = new Set(stories.filter(s => (s.strength ?? 3) >= 3).flatMap(s => s.competencies))

  const handleToggle = (key: 'warmup' | 'main' | 'concept' | 'lead') => {
    setSession(prev => prev ? { ...prev, blocks: prev.blocks.map(b => b.key === key ? { ...b, done: !b.done } : b) } : prev)
    startTransition(async () => { const s = await togglePrepBlock(key); if (s) setSession(s) })
  }

  const blocksDone = session?.blocks.filter(b => b.done).length ?? 0
  const totalMinutes = session?.blocks.reduce((s, b) => s + b.minutes, 0) ?? 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Prep</h1>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">🔥 {props.streak}-day prep streak</span>
        {session && <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-accent">🎯 {session.focus}</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
        <StatTile label="Interview readiness" value={`${overall}%`} sub={`${props.readiness.filter(c => c.score === null).length} blind spots`} valueClass={overall >= 60 ? 'text-good' : overall >= 40 ? 'text-warn' : 'text-risk'} />
        <StatTile label="Cards due" value={dueCards.length} sub={`${cards.length} total · ${reviewedToday} reviewed today`} />
        <StatTile label="Story Bank" value={stories.length} sub={`${coveredCompetencies.size}/${COMPETENCIES.length} competencies covered`} />
        <StatTile label="This week" value={`${props.sessionsLast7}/7`} sub="prep sessions completed" />
      </div>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
          {/* !h-auto: Card's default h-full would stretch this to the taller
              readiness card's height even with items-start. */}
          <Card title="Today's Prep" className="!h-auto" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{blocksDone}/{session?.blocks.length ?? 0} · ~{totalMinutes} min</span>}>
            {!session ? (
              <EmptyState icon={Layers} message="Couldn't build today's session — try reloading." compact />
            ) : (
              <>
                <div className="h-[5px] rounded-[3px] bg-border mb-3">
                  <div className="h-full rounded-[3px] bg-good transition-all" style={{ width: `${(blocksDone / session.blocks.length) * 100}%` }} />
                </div>
                <ol className="flex flex-col gap-2">
                  {session.blocks.map((b, i) => (
                    <li key={b.key} className={`flex items-start gap-3 rounded-[10px] px-3 py-2.5 ${b.done ? 'bg-good-soft' : 'bg-surface-2'}`}>
                      <button onClick={() => handleToggle(b.key)} aria-label={b.done ? `Mark ${b.label} not done` : `Mark ${b.label} done`} aria-pressed={b.done}
                        className={`mt-0.5 w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${b.done ? 'bg-good border-good text-on-good' : 'border-border-strong hover:border-accent'}`}>
                        {b.done && <Check size={12} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`text-[13px] font-semibold ${b.done ? 'text-fg-tertiary line-through' : 'text-fg-primary'}`}>{i + 1}. {b.label}</p>
                          <span className="text-[11px] text-fg-quaternary tabular-nums shrink-0">{b.minutes} min</span>
                        </div>
                        <p className="text-[12px] text-fg-secondary mt-0.5">{b.detail}</p>
                      </div>
                      <Link href={b.href} onClick={e => { if (b.href.startsWith('/prep?tab=')) { e.preventDefault(); setTab(b.href.split('=')[1] as PrepTab) } }}
                        className="shrink-0 text-[11.5px] text-accent hover:underline mt-0.5 whitespace-nowrap">Open →</Link>
                    </li>
                  ))}
                </ol>
                {session.completed_at && <p className="text-[12px] text-good font-semibold mt-3">✓ Session complete — see you tomorrow.</p>}
              </>
            )}
          </Card>

          <Card title="Interview Readiness" action={<span className="text-[11px] text-fg-tertiary">senior / lead FE loop</span>}>
            <p className="text-[11.5px] text-fg-tertiary mb-2.5">
              Next focus: {weakest.map(w => <span key={w.key} className="font-semibold text-fg-secondary">{w.label}</span>).reduce<React.ReactNode[]>((acc, el, i) => i ? [...acc, ' · ', el] : [el], [])}
            </p>
            <ul className="flex flex-col gap-1.5">
              {props.readiness.map(c => {
                const cfg = READINESS_CONFIG[tierFor(c.score)]
                return (
                  <li key={c.key}>
                    <Link href={c.href} className="block rounded-md hover:bg-surface-2 px-1 -mx-1 py-0.5 transition-colors">
                      <div className="flex items-center justify-between text-[12.5px] mb-1 gap-2">
                        <span className="font-medium text-fg-primary truncate">{c.label}</span>
                        <span className="text-[11px] text-fg-tertiary whitespace-nowrap">
                          <span className="text-fg-quaternary hidden sm:inline">{c.basis} · </span><span className="font-semibold" style={{ color: c.score === null ? 'var(--text-tertiary)' : cfg.color }}>{c.score === null ? 'No data' : `${c.score}%`}</span>
                        </span>
                      </div>
                      <div className="h-[5px] rounded-[3px] bg-border">
                        <div className="h-full rounded-[3px]" style={{ width: `${c.score ?? 0}%`, background: cfg.color }} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'flashcards' && (
        <FlashcardsTab
          cards={cards} dueCards={dueCards} today={props.today}
          onReviewed={card => { setCards(prev => prev.map(c => c.id === card.id ? card : c)); setReviewedToday(n => n + 1) }}
          onSynced={(card, s) => { setCards(prev => prev.map(c => c.id === card.id ? card : c)); if (s) setSession(s) }}
          onAdded={card => setCards(prev => [card, ...prev])}
          onDeleted={id => setCards(prev => prev.filter(c => c.id !== id))}
        />
      )}

      {tab === 'stories' && (
        <StoriesTab
          stories={stories} rehearsals={rehearsals} covered={coveredCompetencies}
          onSaved={s => setStories(prev => [s, ...prev.filter(x => x.id !== s.id)])}
          onDeleted={id => setStories(prev => prev.filter(s => s.id !== id))}
          onRehearsed={r => setRehearsals(prev => [r, ...prev])}
        />
      )}
    </div>
  )
}

// ---------------- Flashcards ----------------

const GRADES: { grade: ReviewGrade; label: string; cls: string }[] = [
  { grade: 'again', label: 'Again', cls: 'border-risk-border text-risk hover:bg-risk-soft' },
  { grade: 'hard', label: 'Hard', cls: 'border-border-strong text-warn hover:bg-warn-soft' },
  { grade: 'good', label: 'Good', cls: 'border-border-strong text-good hover:bg-good-soft' },
  { grade: 'easy', label: 'Easy', cls: 'border-border-strong text-accent hover:bg-accent-soft' },
]

function FlashcardsTab({ cards, dueCards, today, onReviewed, onSynced, onAdded, onDeleted }: {
  cards: Flashcard[]; dueCards: Flashcard[]; today: string
  // onReviewed: optimistic (counts the review); onSynced: server result only.
  onReviewed: (card: Flashcard) => void
  onSynced: (card: Flashcard, session: PrepSession | null) => void
  onAdded: (card: Flashcard) => void
  onDeleted: (id: string) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [ahead, setAhead] = useState(false)
  const [busy, startTransition] = useTransition()
  const [form, setForm] = useState({ front: '', back: '', topic: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Queue: due cards first; "Review ahead" pulls the next upcoming ones.
  const queue = ahead ? [...cards].sort((a, b) => a.due_date.localeCompare(b.due_date)) : dueCards
  const current = queue[0] ?? null
  const nextDue = [...cards].filter(c => c.due_date > today).sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date

  const grade = (g: ReviewGrade) => {
    if (!current) return
    const optimistic = { ...current, ...scheduleReview(current, g, today), last_reviewed_at: new Date().toISOString() }
    setRevealed(false)
    onReviewed(optimistic)
    startTransition(async () => { const { card, session } = await reviewFlashcard(current.id, g); onSynced(card, session) })
  }

  const byTopic = Object.entries(cards.reduce<Record<string, number>>((acc, c) => { const t = c.topic ?? 'General'; acc[t] = (acc[t] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[var(--grid-gap)] items-start">
      <Card title={ahead ? 'Reviewing ahead' : 'Review'} className="!h-auto" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{queue.length} in queue</span>}>
        {!current ? (
          <div className="text-center py-8">
            <p className="text-[22px] mb-1.5">✅</p>
            <p className="text-[13px] text-fg-secondary">{cards.length === 0 ? 'No cards yet — missed quiz questions become cards automatically.' : 'All caught up.'}</p>
            {nextDue && <p className="text-[11.5px] text-fg-tertiary mt-1">Next card due {nextDue}</p>}
            {cards.length > 0 && <button onClick={() => setAhead(true)} className="mt-3 text-[12px] text-accent hover:underline">Review ahead</button>}
          </div>
        ) : (
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-2">{current.topic ?? 'General'} · {current.source === 'manual' ? 'your card' : current.source === 'career_quiz' ? 'missed in a topic quiz' : 'missed in a resource quiz'}</p>
            <p className="text-[15px] font-semibold text-fg-primary leading-snug">{current.front}</p>
            {revealed ? (
              <>
                <p className="text-[13px] text-fg-secondary whitespace-pre-wrap mt-3 pt-3 border-t border-surface-3 leading-relaxed">{current.back}</p>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {GRADES.map(g => (
                    <button key={g.grade} onClick={() => grade(g.grade)} disabled={busy} className={`rounded-[8px] border py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${g.cls}`}>
                      {g.label}
                      <span className="block text-[10.5px] font-normal text-fg-quaternary">{intervalLabel(scheduleReview(current, g.grade, today).interval_days)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button onClick={() => setRevealed(true)} className="mt-4 w-full py-2.5 rounded-[8px] bg-accent text-white text-[13px] font-semibold hover:bg-accent/90 transition-colors">Show answer</button>
            )}
            <button onClick={() => setConfirmDelete(current.id)} className="mt-3 text-[11px] text-fg-quaternary hover:text-risk inline-flex items-center gap-1"><Trash2 size={11} /> Delete card</button>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-[var(--grid-gap)]">
        <Card title="Add a card">
          <form className="flex flex-col gap-2" onSubmit={e => {
            e.preventDefault()
            if (!form.front.trim() || !form.back.trim()) return
            const { front, back, topic } = form
            setForm({ front: '', back: '', topic })
            startTransition(async () => onAdded(await addFlashcard(front.trim(), back.trim(), topic.trim() || null)))
          }}>
            <textarea value={form.front} onChange={e => setForm(f => ({ ...f, front: e.target.value }))} placeholder="Question (e.g. What triggers a React re-render?)" rows={2} className={modalInputClass()} />
            <textarea value={form.back} onChange={e => setForm(f => ({ ...f, back: e.target.value }))} placeholder="Answer" rows={3} className={modalInputClass()} />
            <div className="flex gap-2">
              <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Topic (optional)" className={modalInputClass()} />
              <button type="submit" disabled={busy || !form.front.trim() || !form.back.trim()} className={modalSaveButtonClass}>Add</button>
            </div>
          </form>
        </Card>
        {byTopic.length > 0 && (
          <Card title="By topic">
            <ul className="flex flex-col gap-1 text-[12.5px]">
              {byTopic.map(([t, n]) => <li key={t} className="flex justify-between"><span className="text-fg-secondary">{t}</span><span className="text-fg-tertiary tabular-nums">{n}</span></li>)}
            </ul>
          </Card>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog title="Delete card?" description="This flashcard will be permanently removed." onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { const id = confirmDelete; setConfirmDelete(null); setRevealed(false); onDeleted(id); startTransition(() => deleteFlashcard(id)) }} />
      )}
    </div>
  )
}

// ---------------- Story Bank ----------------

const EMPTY_STORY: StoryInput = { title: '', competencies: [], situation: '', task: '', action: '', result: '', metrics: '', strength: 3 }

function StoriesTab({ stories, rehearsals, covered, onSaved, onDeleted, onRehearsed }: {
  stories: Story[]; rehearsals: StoryRehearsal[]; covered: Set<string>
  onSaved: (s: Story) => void; onDeleted: (id: string) => void; onRehearsed: (r: StoryRehearsal) => void
}) {
  const [editing, setEditing] = useState<{ id: string | null; input: StoryInput } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Story | null>(null)
  const firstUncovered = (COMPETENCIES.find(c => !covered.has(c.key))?.key ?? 'ownership') as CompetencyKey
  const [competency, setCompetency] = useState<CompetencyKey>(firstUncovered)
  const [promptIdx, setPromptIdx] = useState(0)
  const [storyId, setStoryId] = useState<string>('')
  const [answer, setAnswer] = useState('')
  const [critique, setCritique] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const prompts = REHEARSAL_PROMPTS[competency]
  const prompt = prompts[promptIdx % prompts.length]
  const tagged = (key: string) => stories.filter(s => s.competencies.includes(key))

  const pickCompetency = (key: CompetencyKey) => { setCompetency(key); setPromptIdx(0); setCritique(null); setStoryId(tagged(key)[0]?.id ?? '') }

  const submitRehearsal = () => {
    if (answer.trim().length < 40) return
    setCritique(null)
    startTransition(async () => {
      const r = await rehearseStory(competency, prompt, answer.trim(), storyId || null)
      setCritique(r.critique)
      onRehearsed(r)
    })
  }

  return (
    <div className="space-y-3">
      <Card title="Competency coverage" action={<button onClick={() => setEditing({ id: null, input: EMPTY_STORY })} className="px-3 py-[6px] rounded-[7px] bg-accent text-white text-[12px] font-semibold hover:bg-accent/80 inline-flex items-center gap-1"><Plus size={12} /> Add story</button>}>
        {(['leadership', 'behavioral'] as const).map(group => (
          <div key={group} className="mb-2 last:mb-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1.5">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {COMPETENCIES.filter(c => c.group === group).map(c => {
                const t = tagged(c.key)
                const state = covered.has(c.key) ? 'covered' : t.length ? 'draft' : 'none'
                return (
                  <button key={c.key} onClick={() => pickCompetency(c.key)} title={`${t.length} stor${t.length === 1 ? 'y' : 'ies'} — click to rehearse`}
                    className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${competency === c.key ? 'ring-2 ring-accent/40' : ''} ${state === 'covered' ? 'bg-good-soft border-good/40 text-good' : state === 'draft' ? 'bg-warn-soft border-warn/40 text-warn' : 'border-border-strong text-fg-tertiary hover:bg-surface-2'}`}>
                    {state === 'covered' ? '✓ ' : state === 'draft' ? '◐ ' : '○ '}{c.label}{t.length > 1 ? ` · ${t.length}` : ''}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <Card title="Rehearse" className="!h-auto" action={<span className="text-[11px] text-fg-tertiary">AI feedback on your answer</span>}>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-[14px] font-semibold text-fg-primary leading-snug">&ldquo;{prompt}&rdquo;</p>
            <button onClick={() => { setPromptIdx(i => i + 1); setCritique(null) }} aria-label="Another prompt" title="Another prompt" className="shrink-0 p-1.5 rounded-md border border-border-strong text-fg-secondary hover:bg-surface-2"><Shuffle size={13} /></button>
          </div>
          <p className="text-[11px] text-fg-tertiary mt-1">{COMPETENCIES.find(c => c.key === competency)?.label}</p>
          <select value={storyId} onChange={e => setStoryId(e.target.value)} className="mt-2.5 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-fg-primary outline-none">
            <option value="">No linked story (answer from scratch)</option>
            {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={7} placeholder="Answer as you would out loud — Situation, Task, your Actions, the Result (with numbers)."
            className="mt-2 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="text-[11px] text-fg-quaternary tabular-nums">{answer.trim().split(/\s+/).filter(Boolean).length} words · aim for ~250</span>
            <button onClick={submitRehearsal} disabled={busy || answer.trim().length < 40} className={`${modalSaveButtonClass} inline-flex items-center gap-1.5`}>
              <Sparkles size={13} /> {busy ? 'Reviewing…' : 'Get feedback'}
            </button>
          </div>
          {busy && <div className="space-y-2 mt-3">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
          {critique && <p className="mt-3 text-[13px] text-fg-secondary whitespace-pre-wrap leading-relaxed border-l-2 border-accent/40 pl-3">{critique}</p>}
          {rehearsals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-surface-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1.5">Recent rehearsals</p>
              <ul className="flex flex-col gap-1">
                {rehearsals.slice(0, 5).map(r => (
                  <li key={r.id} className="text-[12px] text-fg-secondary truncate">
                    <span className="text-fg-quaternary">{r.created_at.slice(5, 10)}</span> · {COMPETENCIES.find(c => c.key === r.competency)?.label ?? r.competency} — <span className="text-fg-tertiary">{r.critique?.split('\n')[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title={`Stories (${stories.length})`} className="!h-auto">
          {stories.length === 0 ? (
            <EmptyState icon={MessageSquareQuote} message="No stories yet — add 1–2 real examples per competency from your work." compact cta={{ label: 'Add story', onClick: () => setEditing({ id: null, input: EMPTY_STORY }) }} />
          ) : (
            <ul className="flex flex-col gap-2">
              {stories.map(s => {
                const open = expanded === s.id
                return (
                  <li key={s.id} className="rounded-[10px] bg-surface-2 px-3 py-2.5">
                    <button onClick={() => setExpanded(open ? null : s.id)} className="w-full text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-fg-primary truncate">{s.title}</p>
                        <span className="text-[11px] text-warn shrink-0" aria-label={`Strength ${s.strength ?? '-'} of 5`}>{'★'.repeat(s.strength ?? 0)}<span className="text-fg-quaternary">{'★'.repeat(5 - (s.strength ?? 0))}</span></span>
                      </div>
                      <p className="text-[11px] text-fg-tertiary mt-0.5 truncate">{s.competencies.map(k => COMPETENCIES.find(c => c.key === k)?.label ?? k).join(' · ') || 'No competency tagged'}</p>
                    </button>
                    {open && (
                      <div className="mt-2 pt-2 border-t border-surface-3 text-[12.5px] text-fg-secondary space-y-1.5">
                        {(['situation', 'task', 'action', 'result', 'metrics'] as const).map(f => s[f] ? <p key={f}><span className="font-semibold text-fg-primary capitalize">{f}: </span>{s[f]}</p> : null)}
                        <div className="flex gap-3 pt-1">
                          <button onClick={() => setEditing({ id: s.id, input: { title: s.title, competencies: s.competencies, situation: s.situation, task: s.task, action: s.action, result: s.result, metrics: s.metrics, strength: s.strength } })} className="text-[11.5px] text-accent hover:underline">Edit</button>
                          <button onClick={() => { const k = (s.competencies[0] ?? competency) as CompetencyKey; pickCompetency(k); setStoryId(s.id) }} className="text-[11.5px] text-accent hover:underline">Rehearse</button>
                          <button onClick={() => setConfirmDelete(s)} className="text-[11.5px] text-fg-quaternary hover:text-risk">Delete</button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {editing && (
        <StoryModal initial={editing.input} isNew={!editing.id} onClose={() => setEditing(null)}
          onSave={input => { const id = editing.id; setEditing(null); startTransition(async () => onSaved(await saveStory(id, input))) }} />
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete story?" description={`"${confirmDelete.title}" will be permanently removed.`} onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { const id = confirmDelete.id; setConfirmDelete(null); onDeleted(id); startTransition(() => deleteStory(id)) }} />
      )}
    </div>
  )
}

function StoryModal({ initial, isNew, onClose, onSave }: { initial: StoryInput; isNew: boolean; onClose: () => void; onSave: (input: StoryInput) => void }) {
  const [s, setS] = useState<StoryInput>(initial)
  useEscapeKey(onClose)
  const set = <K extends keyof StoryInput>(k: K, v: StoryInput[K]) => setS(prev => ({ ...prev, [k]: v }))
  const toggleCompetency = (key: string) => set('competencies', s.competencies.includes(key) ? s.competencies.filter(c => c !== key) : [...s.competencies, key])
  const fields: { key: 'situation' | 'task' | 'action' | 'result' | 'metrics'; label: string; placeholder: string; rows: number }[] = [
    { key: 'situation', label: 'Situation', placeholder: 'Context — team, product, what was at stake', rows: 2 },
    { key: 'task', label: 'Task', placeholder: 'Your responsibility / the goal', rows: 2 },
    { key: 'action', label: 'Action', placeholder: 'What YOU did — decisions, trade-offs, how you influenced others', rows: 4 },
    { key: 'result', label: 'Result', placeholder: 'Outcome — what changed', rows: 2 },
    { key: 'metrics', label: 'Metrics', placeholder: 'Numbers: % faster, bugs down, team size, time saved', rows: 1 },
  ]
  return (
    <Modal title={isNew ? 'Add story' : 'Edit story'} onClose={onClose} maxWidthClass="max-w-[560px]">
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); if (s.title.trim()) onSave({ ...s, title: s.title.trim() }) }}>
        <div>
          <label className={modalLabelClass}>Title</label>
          <input value={s.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Migrated checkout to RSC without a feature freeze" autoFocus required className={modalInputClass()} />
        </div>
        <div>
          <label className={modalLabelClass}>Competencies</label>
          <div className="flex flex-wrap gap-1.5">
            {COMPETENCIES.map(c => (
              <button type="button" key={c.key} onClick={() => toggleCompetency(c.key)} aria-pressed={s.competencies.includes(c.key)}
                className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${s.competencies.includes(c.key) ? 'bg-accent-soft border-accent text-accent' : 'border-border-strong text-fg-secondary hover:bg-surface-2'}`}>{c.label}</button>
            ))}
          </div>
        </div>
        {fields.map(f => (
          <div key={f.key}>
            <label className={modalLabelClass}>{f.label}</label>
            <textarea value={s[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} rows={f.rows} className={modalInputClass()} />
          </div>
        ))}
        <div>
          <label className={modalLabelClass}>Strength (how interview-ready is it?)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} onClick={() => set('strength', n)} aria-label={`${n} of 5`} className={`text-[20px] leading-none ${n <= (s.strength ?? 0) ? 'text-warn' : 'text-fg-quaternary'}`}>★</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2.5 mt-1">
          <button type="button" onClick={onClose} className={modalCancelButtonClass}>Cancel</button>
          <button type="submit" className={modalSaveButtonClass}>Save</button>
        </div>
      </form>
    </Modal>
  )
}

