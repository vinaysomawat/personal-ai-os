'use client'

import { useState, useTransition } from 'react'
import { MessageSquareQuote, Plus, Shuffle, Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import PageTabs from '@/components/PageTabs'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import Modal, { modalLabelClass, modalInputClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { useEscapeKey } from '@/lib/use-escape-key'
import { daysAgoIST, toISTDateStr } from '@/lib/date'
import { formatOf, type MockRound } from '../mock'
import { startFocusSession, togglePrepBlock, saveStory, deleteStory, rehearseStory, type StoryInput } from '../actions'
import { COMPETENCIES, REHEARSAL_PROMPTS, type BankQuestion, type CompetencyKey, type PrepSession, type PrepSettings, type ReadinessCell, type Story, type StoryRehearsal } from '../types'
import type { CategoryCoverage, CategoryQuota } from '../hunt'
import { HuntModeCard, QuestionsTab } from './QuestionsTab'
import { MockTab } from './MockTab'
import { FocusBar, FocusOverlay, ForecastCard, GatesCard, MissionCard, RevisionCard, WarHeader, WeaknessCard } from './WarRoom'
import { focusSeconds, hm, type FocusSession, type Forecast, type RevisionItem, type TopicWeakness, type WarReadiness } from '../war'
import PageHeader, { HeaderChip } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'

export type PrepTab = 'today' | 'questions' | 'mock' | 'stories'
const TABS: { key: PrepTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'questions', label: 'Questions' },
  { key: 'mock', label: 'Mock Round' },
  { key: 'stories', label: 'Story Bank' },
]

interface Props {
  initialTab: PrepTab
  initialCategory: string | null
  initialFormat: string | null
  today: string
  session: PrepSession | null
  streak: number
  sessionsLast7: number
  mockRounds: MockRound[]
  war: WarReadiness
  weakness: TopicWeakness[]
  revision: RevisionItem[]
  focusSessions: FocusSession[]
  forecast: { date: string; forecast: Forecast } | null
  stories: Story[]
  rehearsals: StoryRehearsal[]
  readiness: ReadinessCell[]
  settings: PrepSettings
  daysLeft: number | null
  coverage: (CategoryCoverage | CategoryQuota)[]
  bank: BankQuestion[]
}

export default function PrepView(props: Props) {
  const [tab, setTab] = useState<PrepTab>(props.initialTab)
  const [bankCategory, setBankCategory] = useState(props.initialCategory)
  const [session, setSession] = useState(props.session)
  const [mockFormat, setMockFormat] = useState(props.initialFormat)
  const [bank, setBank] = useState(props.bank)
  const [rounds, setRounds] = useState(props.mockRounds)
  const [stories, setStories] = useState(props.stories)
  const [rehearsals, setRehearsals] = useState(props.rehearsals)
  const [, startTransition] = useTransition()

  const [focusSessions, setFocusSessions] = useState(props.focusSessions)
  const [bankTopic, setBankTopic] = useState('')
  const [overlayHidden, setOverlayHidden] = useState(false)
  const todayFocus = focusSessions.filter(f => f.date === props.today)
  const focusedToday = Math.round(todayFocus.reduce((s, f) => s + focusSeconds(f), 0) / 60)
  const activeFocus = focusSessions.find(f => f.status === 'active') ?? null
  const upsertFocus = (f: FocusSession) => setFocusSessions(prev => [...prev.filter(x => x.id !== f.id), f])

  // In-page links switch tabs (and the Questions category/topic or Mock
  // format) instead of navigating.
  const openHref = (href: string) => {
    if (!href.startsWith('/prep?')) { window.location.href = href; return }
    const p = new URLSearchParams(href.split('?')[1])
    setTab(p.get('tab') as PrepTab)
    if (p.get('cat')) { setBankCategory(p.get('cat')); setBankTopic('') }
    if (p.get('format')) setMockFormat(p.get('format'))
    setOverlayHidden(true)
  }
  const openTopic = (category: string, topic: string) => { setBankCategory(category); setBankTopic(topic); setTab('questions') }
  const startFocus = (key: string) => {
    if (activeFocus?.block_key === key) { setOverlayHidden(false); return }
    startTransition(async () => { const f = await startFocusSession(key); if (f) { upsertFocus(f); setOverlayHidden(false) } })
  }

  const lastRound = rounds[0] ?? null
  const roundsThisWeek = rounds.filter(r => toISTDateStr(r.created_at) >= daysAgoIST(6)).length
  const coveredCompetencies = new Set(stories.filter(s => (s.strength ?? 3) >= 3).flatMap(s => s.competencies))

  const handleToggle = (key: string) => {
    setSession(prev => prev ? { ...prev, blocks: prev.blocks.map(b => b.key === key ? { ...b, done: !b.done } : b) } : prev)
    startTransition(async () => { const s = await togglePrepBlock(key); if (s) setSession(s) })
  }


  return (
    <div className="space-y-3">
      <PageHeader title="Prep" chips={<>
        <HeaderChip>🔥 {props.streak}-day prep streak</HeaderChip>
        {session && <HeaderChip tone="accent">🎯 {session.focus}</HeaderChip>}
        {props.daysLeft !== null && <HeaderChip>📅 Interview-ready by {props.settings.target_date}</HeaderChip>}
      </>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
        <StatCard label="Interview readiness" value={`${props.war.overall}%`} sub={props.war.ready ? 'all gates passed' : `not ready · ${props.war.blockers.length} blockers`} valueClassName={props.war.ready ? 'text-good' : props.war.overall >= 60 ? 'text-warn' : 'text-risk'} />
        <StatCard label="Mock rounds" value={roundsThisWeek} sub={lastRound ? `this week · last ${formatOf(lastRound.format).label} ${toISTDateStr(lastRound.created_at).slice(5)}${lastRound.review?.score != null ? ` · ${lastRound.review.score}/10` : ''}` : 'this week · none yet'} />
        <StatCard label="Story Bank" value={stories.length} sub={`${coveredCompetencies.size}/${COMPETENCIES.length} competencies covered`} />
        <StatCard label="Focused today" value={hm(focusedToday)} sub={`${hm(Math.round(focusSessions.reduce((s, f) => s + focusSeconds(f), 0) / 60))} last 7 days · ${props.sessionsLast7}/7 full days`} />
      </div>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'today' && <HuntModeCard settings={props.settings} daysLeft={props.daysLeft} coverage={props.coverage} />}

      {tab === 'today' && (
        <>
          <WarHeader war={props.war} daysLeft={props.daysLeft} targetDate={props.settings.target_date} session={session} focusedMinutes={focusedToday} />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-[var(--grid-gap)] items-start">
            <div className="space-y-[var(--grid-gap)]">
              <MissionCard session={session} focusSessions={todayFocus} onToggle={handleToggle} onStart={startFocus} onOpen={openHref} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--grid-gap)] items-start">
                <RevisionCard items={props.revision} onOpen={openTopic} />
                <WeaknessCard items={props.weakness} onOpen={openTopic} />
              </div>
            </div>
            <div className="space-y-[var(--grid-gap)]">
              <GatesCard cells={props.readiness} war={props.war} />
              <ForecastCard forecast={props.forecast} today={props.today} />
            </div>
          </div>
        </>
      )}

      {/* Kept mounted so answers made here survive switching tabs. */}
      <div hidden={tab !== 'questions'}>
        <QuestionsTab bank={bank} setBank={setBank} topic={bankTopic} onTopicChange={setBankTopic} coverage={props.coverage} category={bankCategory} onCategoryChange={setBankCategory} today={props.today} onGraded={s => { if (s) setSession(s) }} />
      </div>

      {tab === 'mock' && (
        <MockTab
          bank={bank} readiness={props.readiness} covered={coveredCompetencies} rounds={rounds} today={props.today}
          format={mockFormat} onFormatChange={setMockFormat}
          onSaved={(round, s) => {
            setRounds(prev => [round, ...prev])
            const now = round.created_at
            const answered = new Map(round.items.filter(i => i.question_id && !i.skipped).map(i => [i.question_id!, i]))
            setBank(prev => prev.map(q => { const it = answered.get(q.id); return it ? { ...q, last_seen_at: now, last_answer: it.answer.trim() || q.last_answer } : q }))
            if (s) setSession(s)
          }}
          onRoundUpdated={round => setRounds(prev => prev.map(r => r.id === round.id ? round : r))}
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
      {activeFocus && !overlayHidden && (
        <FocusOverlay focus={activeFocus} block={session?.blocks.find(b => b.key === activeFocus.block_key) ?? null}
          onChange={upsertFocus} onOpen={openHref}
          onEnded={(f, s) => { if (f) upsertFocus(f); if (s) setSession(s) }} />
      )}
      {activeFocus && overlayHidden && <FocusBar focus={activeFocus} onShow={() => setOverlayHidden(false)} />}
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
        <Card title="Rehearse" action={<span className="text-[11px] text-fg-tertiary">AI feedback on your answer</span>}>
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
            <span className="text-[11px] text-fg-tertiary tabular-nums">{answer.trim().split(/\s+/).filter(Boolean).length} words · aim for ~250</span>
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
                    <span className="text-fg-tertiary">{r.created_at.slice(5, 10)}</span> · {COMPETENCIES.find(c => c.key === r.competency)?.label ?? r.competency} — <span className="text-fg-tertiary">{r.critique?.split('\n')[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title={`Stories (${stories.length})`}>
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
                        <span className="text-[11px] text-warn shrink-0" aria-label={`Strength ${s.strength ?? '-'} of 5`}>{'★'.repeat(s.strength ?? 0)}<span className="text-fg-tertiary">{'★'.repeat(5 - (s.strength ?? 0))}</span></span>
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
              <button type="button" key={n} onClick={() => set('strength', n)} aria-label={`${n} of 5`} className={`text-[20px] leading-none ${n <= (s.strength ?? 0) ? 'text-warn' : 'text-fg-tertiary'}`}>★</button>
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

