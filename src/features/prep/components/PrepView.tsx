'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronRight, MessageSquareQuote, Plus, RotateCcw, Shuffle, Sparkles } from 'lucide-react'
import Card from '@/components/Card'
import MicButton, { appendText } from '@/components/MicButton'
import PageTabs from '@/components/PageTabs'
import EmptyState from '@/components/EmptyState'
import ConfirmDialog from '@/components/ConfirmDialog'
import Modal, { modalLabelClass, modalInputClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { useEscapeKey } from '@/lib/use-escape-key'
import { prepDaysAgo, toPrepDateStr } from '@/lib/date'
import { formatOf, type MockRound } from '../mock'
import { savePrepToday, endFocusSession, startFocusSession, toggleFocusSessionPause, saveStory, deleteStory, rehearseStory, type StoryInput } from '../actions'
import { COMPETENCIES, REHEARSAL_PROMPTS, type BankQuestion, type CompetencyKey, type PrepSession, type PrepSettings, type ReadinessCell, type Story, type StoryRehearsal } from '../types'
import { QuestionsTab } from './QuestionsTab'
import { MockTab } from './MockTab'
import { AiTab } from './AiTab'
import { InterviewTab } from './InterviewTab'
import type { InterviewPrep } from '../jd'
import type { RoadmapProgress, RoadmapStepDone } from '../roadmap'
import AnswerReview from './AnswerReview'
import TimelineCard from './TimelineCard'
import { liveTimeline } from '../timeline'
import { applyTodayPatch, layoutDay, patchTouchesBlocks, type DayTemplate, type TodayPatch } from '../dayplan'
import { EditDefaultPlan, EditToday } from './DayEditor'
import { FocusBar, TodayHeader } from './WarRoom'
import { blockProgress, blockReached, canFinishBlock, dayPace, windowOf, clock, focusSeconds, focusedMinutes, prepHourNow, paceLabel, paceStatus, practicedToday, type FocusSession, type WarReadiness } from '../war'
import PageHeader, { HeaderChip } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { guard } from '@/lib/guard'

export type PrepTab = 'today' | 'interview' | 'ai' | 'questions' | 'mock' | 'stories'
const TABS: { key: PrepTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'interview', label: 'Interview' },
  { key: 'ai', label: 'AI Engineer' },
  { key: 'questions', label: 'Questions' },
  { key: 'mock', label: 'Mock Round' },
  { key: 'stories', label: 'Story Bank' },
]

interface Props {
  initialTab: PrepTab
  initialCategory: string | null
  initialFormat: string | null
  initialTopic: string | null
  today: string
  session: PrepSession | null
  streak: number
  sessionsLast7: number
  mockRounds: MockRound[]
  war: WarReadiness
  focusSessions: FocusSession[]
  template: DayTemplate
  stories: Story[]
  rehearsals: StoryRehearsal[]
  readiness: ReadinessCell[]
  settings: PrepSettings
  bank: BankQuestion[]
  roadmap: RoadmapProgress[]
  roadmapSteps: RoadmapStepDone[]
  interviewPreps: InterviewPrep[]
}

// A focus session shown before the server has saved it (optimistic start).
const TEMP_FOCUS = 'tmp-'

export default function PrepView(props: Props) {
  const [tab, setTab] = useState<PrepTab>(props.initialTab)
  const [bankCategory, setBankCategory] = useState(props.initialCategory)
  const [session, setSession] = useState(props.session)
  const [mockFormat, setMockFormat] = useState(props.initialFormat)
  const [bank, setBank] = useState(props.bank)
  const [rounds, setRounds] = useState(props.mockRounds)
  const [stories, setStories] = useState(props.stories)
  const [rehearsals, setRehearsals] = useState(props.rehearsals)
  const [roadmap, setRoadmap] = useState(props.roadmap)
  const [interviewPreps, setInterviewPreps] = useState(props.interviewPreps)
  const [, startTransition] = useTransition()

  const [focusSessions, setFocusSessions] = useState(props.focusSessions)
  const [bankTopic, setBankTopic] = useState(props.initialTopic ?? '')
  // Shown briefly after a session ends itself (its block got done).
  const [focusEnded, setFocusEnded] = useState<{ label: string; seconds: number } | null>(null)
  // Pace vs today's timeline (first to last slot), re-read every minute.
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 60_000); return () => clearInterval(t) }, [])
  // Today's answers per category (block progress).
  const doneToday: Record<string, number> = practicedToday(bank, props.today)
  // Question blocks are time boxes: focused minutes or answers × minutes per question.
  const progressCtx = { answered: doneToday, focused: focusedMinutes(focusSessions, props.today) }
  // Today on the clock (dayplan.ts layoutDay) from the session's own start /
  // interview, re-flowed on the minute tick.
  const planned = layoutDay(session?.blocks ?? [], props.template, session?.start_min ?? props.settings.day_start_min, session?.interview ?? null, session?.breaks ?? [])
  const dayWin = windowOf(planned.rows)
  const pace = dayPace(session?.blocks ?? [], prepHourNow(), progressCtx, dayWin)
  // The plan on the clock, re-flowed with the same minute tick.
  const timeline = liveTimeline(planned.rows, Math.round(prepHourNow() * 60))
  // Which editor is open on the Today tab (nothing saves until its Save).
  const [editing, setEditing] = useState<null | 'items' | 'interview' | 'default'>(null)
  const [editError, setEditError] = useState<string | null>(null)
  // Edit today saves a patch of only what changed: applied here at once (the
  // editor closes), saved behind; a failed save restores the day and
  // reopens the editor with the error.
  const saveToday = (patch: TodayPatch) => {
    setEditing(null)
    setEditError(null)
    if (!session || !Object.keys(patch).length) return
    const before = session
    setSession({
      ...session,
      ...(patch.startMin !== undefined ? { start_min: patch.startMin } : {}),
      ...(patch.interview !== undefined ? { interview: patch.interview } : {}),
      ...(patch.breaks !== undefined ? { breaks: patch.breaks.length ? patch.breaks : null } : {}),
      ...(patchTouchesBlocks(patch) ? { blocks: applyTodayPatch(session.blocks, patch, props.today) } : {}),
    })
    startTransition(async () => {
      try { setSession(await savePrepToday(patch)) }
      catch (e) { setSession(before); setEditError(e instanceof Error ? e.message : 'Could not save'); setEditing('items') }
    })
  }
  const activeFocus = focusSessions.find(f => f.status === 'active') ?? null
  const upsertFocus = (f: FocusSession) => setFocusSessions(prev => [...prev.filter(x => x.id !== f.id), f])

  // In-page links switch tabs (and the Questions category/topic or Mock
  // format) instead of navigating.
  const openHref = (href: string) => {
    if (!href.startsWith('/prep?')) { window.location.href = href; return }
    const p = new URLSearchParams(href.split('?')[1])
    setTab(p.get('tab') as PrepTab)
    if (p.get('cat')) { setBankCategory(p.get('cat')); setBankTopic(p.get('topic') ?? '') }
    if (p.get('format')) setMockFormat(p.get('format'))
  }
  const openTopic = (category: string, topic: string) => { setBankCategory(category); setBankTopic(topic); setTab('questions') }
  // Start (or return to) a block's focus session and go straight to its work;
  // the timer is the floating FocusBar, not a separate screen.
  const goToWork = (key: string) => {
    const href = session?.blocks.find(b => b.key === key)?.href
    if (href?.startsWith('/prep')) openHref(href)
  }
  // The timer is optimistic: the bar appears, pauses and stops at once, and
  // the server call runs behind it (its row replaces the local one; a
  // failed start removes the local bar again).
  const startFocus = (key: string) => {
    goToWork(key)
    const block = session?.blocks.find(b => b.key === key)
    if (activeFocus || !block) return
    setFocusEnded(null)
    const temp: FocusSession = {
      id: `${TEMP_FOCUS}${Date.now()}`, date: props.today, block_key: key, label: block.label, planned_minutes: block.minutes,
      started_at: new Date().toISOString(), paused_at: null, paused_seconds: 0, interruptions: 0, ended_at: null, actual_seconds: null, status: 'active',
    }
    upsertFocus(temp)
    startTransition(guard(async () => {
      try {
        const f = await startFocusSession({ key, label: block.label, minutes: block.minutes })
        setFocusSessions(prev => [...prev.filter(x => x.id !== temp.id && x.id !== f.id), f])
      } catch (e) {
        setFocusSessions(prev => prev.filter(x => x.id !== temp.id))
        throw e
      }
    }))
  }
  const pauseFocus = (f: FocusSession) => {
    const now = new Date()
    upsertFocus(f.paused_at
      ? { ...f, paused_at: null, paused_seconds: f.paused_seconds + Math.round((now.getTime() - new Date(f.paused_at).getTime()) / 1000) }
      : { ...f, paused_at: now.toISOString(), interruptions: f.interruptions + 1 })
    startTransition(guard(async () => { const r = await toggleFocusSessionPause(f.id); if (r) upsertFocus(r) }))
  }
  // Finish ticks the block locally at once; Stop keeps the time (the server
  // may still tick a question block whose minutes that time reached).
  const endFocus = (f: FocusSession, finished: boolean) => {
    const seconds = focusSeconds(f)
    upsertFocus({ ...f, status: finished ? 'completed' : 'abandoned', ended_at: new Date().toISOString(), actual_seconds: seconds, paused_at: null })
    if (finished) {
      setSession(prev => prev && { ...prev, blocks: prev.blocks.map(b => b.key === f.block_key ? { ...b, done: true } : b) })
      setFocusEnded({ label: f.label, seconds })
    }
    startTransition(guard(async () => {
      const r = await endFocusSession(f.id, finished)
      if (r.focus) upsertFocus(r.focus)
      if (r.session) setSession(r.session)
    }))
  }
  // The server completes the session when its block turns done (minutes
  // reached, ticked); mirror that locally the moment the plan comes back done.
  const activeBlock = activeFocus ? session?.blocks.find(b => b.key === activeFocus.block_key) ?? null : null
  useEffect(() => {
    if (!activeFocus || !activeBlock?.done) return
    const seconds = focusSeconds(activeFocus)
    upsertFocus({ ...activeFocus, status: 'completed', ended_at: new Date().toISOString(), actual_seconds: seconds, paused_at: null })
    setFocusEnded({ label: activeFocus.label, seconds })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on the block turning done
  }, [activeFocus?.id, activeBlock?.done])
  useEffect(() => {
    if (!focusEnded) return
    const t = setTimeout(() => setFocusEnded(null), 5000)
    return () => clearTimeout(t)
  }, [focusEnded])
  // A question block whose timer reaches its minutes finishes itself
  // (checked on the minute tick, so at most a minute late; a failed request
  // is tried again on the next tick).
  const reachedByTime = !!activeFocus && !!activeBlock && !activeBlock.done && activeBlock.key.startsWith('bank:') && blockReached(activeBlock, progressCtx)
  const finishing = useRef(false)
  useEffect(() => {
    if (!reachedByTime || !activeFocus || finishing.current) return
    finishing.current = true
    startTransition(guard(async () => {
      try {
        const r = await endFocusSession(activeFocus.id, true)
        if (r.focus) upsertFocus(r.focus)
        if (r.session) setSession(r.session)
      } finally {
        finishing.current = false
      }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires when the block's minutes are reached, and again each tick until it succeeds
  }, [reachedByTime, tick])
  // "45m/1h 40m · 3 answered" for a question block.
  const focusProgress = activeFocus && activeBlock?.key.startsWith('bank:')
    ? `${Math.floor(blockProgress(activeBlock, progressCtx))}/${activeBlock.minutes}m · ${doneToday[activeBlock.key.slice(5)] ?? 0} answered`
    : null
  const canFinish = !activeBlock || canFinishBlock(activeBlock, progressCtx)

  const lastRound = rounds[0] ?? null
  const roundsThisWeek = rounds.filter(r => toPrepDateStr(r.created_at) >= prepDaysAgo(6)).length
  const coveredCompetencies = new Set(stories.filter(s => (s.strength ?? 3) >= 3).flatMap(s => s.competencies))



  return (
    <div className="space-y-3">
      <PageHeader title="Prep" chips={<>
        <HeaderChip>🔥 {props.streak}-day prep streak</HeaderChip>
        {session && <HeaderChip tone="accent">🎯 {session.focus}</HeaderChip>}
      </>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
        <StatCard label="Interview readiness" value={`${props.war.overall}%`} sub={props.war.ready ? 'all gates passed' : `${props.war.interviewReady ? 'interview-ready' : 'not ready'} · ${props.war.blockers.length} blockers`} valueClassName={props.war.ready || props.war.interviewReady ? 'text-good' : props.war.overall >= 60 ? 'text-warn' : 'text-risk'} />
        <StatCard label="Mock rounds" value={roundsThisWeek} sub={lastRound ? `this week · last ${formatOf(lastRound.format).label} ${toPrepDateStr(lastRound.created_at).slice(5)}${lastRound.review?.score != null ? ` · ${lastRound.review.score}/10` : ''}` : 'this week · none yet'} />
        <StatCard label="Story Bank" value={stories.length} sub={`${coveredCompetencies.size}/${COMPETENCIES.length} competencies covered`} />
        <StatCard label="Pace" value={paceLabel(pace)} valueClassName={PACE_CLS[paceStatus(pace)]} sub={`${pace.donePct}% done · ${pace.dayPct}% of day gone · ${props.sessionsLast7}/7 full days`} />
      </div>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} />


      {tab === 'today' && (
        <>
          <TodayHeader windowLabel={dayWin.label} interviewAt={session?.interview ? clock(session.interview.start) : null} pace={pace} blocks={session?.blocks ?? []}
            onInterview={() => setEditing('interview')} onEditToday={() => setEditing('items')} onEditDefault={() => setEditing('default')} />
          {editing === 'default' && <EditDefaultPlan template={props.template} dayStartMin={props.settings.day_start_min} onCancel={() => setEditing(null)} />}
          {session && (editing === 'items' || editing === 'interview') && (
            <EditToday key={editing} template={props.template} startMin={session.start_min ?? props.settings.day_start_min} interview={session.interview}
              breaks={session.breaks ?? []} blocks={session.blocks} focus={editing} error={editError} onSave={saveToday} onCancel={() => { setEditing(null); setEditError(null) }} />
          )}
          {(session?.blocks.length ?? 0) > 0 && editing !== 'items' && editing !== 'interview' && (
            <TimelineCard timeline={timeline} windowLabel={dayWin.label} nowMin={Math.round(prepHourNow() * 60)} dropped={planned.dropped.map(b => b.label)}
              activeKey={activeFocus?.block_key ?? null} onStart={startFocus} />
          )}
        </>
      )}

      {tab === 'interview' && <InterviewTab preps={interviewPreps} setPreps={setInterviewPreps} today={props.today} onOpenTopic={openTopic} onSession={setSession} />}

      {tab === 'ai' && <AiTab today={props.today} progress={roadmap} setProgress={setRoadmap} steps={props.roadmapSteps} bank={bank} onOpenTopic={openTopic} />}

      {/* Kept mounted so answers made here survive switching tabs. */}
      <div hidden={tab !== 'questions'}>
        <QuestionsTab bank={bank} setBank={setBank} topic={bankTopic} onTopicChange={setBankTopic} blocks={session?.blocks ?? []} category={bankCategory} onCategoryChange={setBankCategory} today={props.today} onGraded={s => { if (s) setSession(s) }} />
      </div>

      {tab === 'mock' && (
        <MockTab
          bank={bank} readiness={props.readiness} covered={coveredCompetencies} rounds={rounds} today={props.today}
          format={mockFormat} onFormatChange={setMockFormat}
          onSaved={(round, s) => {
            setRounds(prev => [round, ...prev])
            const now = round.created_at
            const answered = new Set(round.items.filter(i => i.question_id && !i.skipped).map(i => i.question_id!))
            setBank(prev => prev.map(q => answered.has(q.id) ? { ...q, last_seen_at: now } : q))
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
      <FocusBar focus={activeFocus} progress={focusProgress} canFinish={canFinish} ended={focusEnded}
        onPause={pauseFocus} onFinish={f => endFocus(f, true)} onStop={f => endFocus(f, false)}
        onGo={() => activeFocus && goToWork(activeFocus.block_key)} />
    </div>
  )
}

const PACE_CLS = { ahead: 'text-good', on: 'text-fg-primary', behind: 'text-risk' } as const

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
  // The rehearsal just graded (shown under the editor).
  const [latest, setLatest] = useState<StoryRehearsal | null>(null)
  // A past rehearsal's prompt loaded by "Retry this prompt".
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null)
  const [spoken, setSpoken] = useState(false)
  const [openRehearsal, setOpenRehearsal] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const prompts = REHEARSAL_PROMPTS[competency]
  const prompt = retryPrompt ?? prompts[promptIdx % prompts.length]
  const tagged = (key: string) => stories.filter(s => s.competencies.includes(key))

  const pickCompetency = (key: CompetencyKey) => { setCompetency(key); setPromptIdx(0); setRetryPrompt(null); setLatest(null); setStoryId(tagged(key)[0]?.id ?? '') }

  const submitRehearsal = () => {
    if (answer.trim().length < 40) return
    setLatest(null)
    startTransition(guard(async () => {
      const r = await rehearseStory(competency, prompt, answer.trim(), storyId || null, spoken)
      setLatest(r)
      onRehearsed(r)
    }))
  }
  const retry = (r: StoryRehearsal) => {
    setCompetency(r.competency as CompetencyKey); setRetryPrompt(r.prompt); setAnswer(r.answer)
    setStoryId(r.story_id ?? ''); setSpoken(false); setLatest(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <button onClick={() => { setPromptIdx(i => i + 1); setRetryPrompt(null); setLatest(null) }} aria-label="Another prompt" title="Another prompt" className="shrink-0 p-1.5 rounded-md border border-border-strong text-fg-secondary hover:bg-surface-2"><Shuffle size={13} /></button>
          </div>
          <p className="text-[11px] text-fg-tertiary mt-1">{COMPETENCIES.find(c => c.key === competency)?.label}</p>
          <select value={storyId} onChange={e => setStoryId(e.target.value)} className="mt-2.5 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-fg-primary outline-none">
            <option value="">No linked story (answer from scratch)</option>
            {stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={7} placeholder="Answer as you would out loud — Situation, Task, your Actions, the Result (with numbers)."
            className="mt-2 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
          <div className="flex items-center justify-between mt-2 gap-2">
            <span className="inline-flex items-center gap-2 min-w-0">
              <MicButton onText={text => { setAnswer(prev => appendText(prev, text)); setSpoken(true) }} />
              <span className="text-[11px] text-fg-tertiary tabular-nums truncate">{answer.trim().split(/\s+/).filter(Boolean).length} words · aim for ~250</span>
            </span>
            <button onClick={submitRehearsal} disabled={busy || answer.trim().length < 40} className={`${modalSaveButtonClass} inline-flex items-center gap-1.5`}>
              <Sparkles size={13} /> {busy ? 'Reviewing…' : 'Get feedback'}
            </button>
          </div>
          {busy && <div className="space-y-2 mt-3">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
          {latest && !busy && <AnswerReview card={latest.scorecard} text={latest.critique ?? ''} rating={latest.rating} question={latest.prompt} />}
          {rehearsals.length > 0 && (
            <div className="mt-4 pt-3 border-t border-surface-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1.5">Recent rehearsals · {rehearsals.length}</p>
              <ul className="flex flex-col rounded-[8px] border border-border divide-y divide-border">
                {rehearsals.slice(0, 10).map(r => {
                  const isOpen = openRehearsal === r.id
                  return (
                    <li key={r.id}>
                      <button onClick={() => setOpenRehearsal(isOpen ? null : r.id)} aria-expanded={isOpen}
                        className={`w-full text-left px-2.5 py-[7px] flex items-center gap-2 transition-colors ${isOpen ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
                        <ChevronRight size={12} className={`shrink-0 text-fg-tertiary transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{toPrepDateStr(r.created_at).slice(5)}</span>
                        <span className="text-[12px] text-fg-primary min-w-0 flex-1 truncate">
                          <span className="font-medium">{COMPETENCIES.find(c => c.key === r.competency)?.label ?? r.competency}</span>
                          <span className="text-fg-tertiary"> · {r.prompt}</span>
                        </span>
                        {r.rating !== null
                          ? <span className={`text-[10.5px] font-bold tabular-nums rounded-[4px] px-1 shrink-0 ${r.rating >= 8 ? 'text-good bg-good-soft' : r.rating >= 6 ? 'text-warn bg-warn-soft' : 'text-risk bg-risk-soft'}`}>{r.rating}</span>
                          : <span className="text-[10.5px] text-fg-quaternary shrink-0">—</span>}
                      </button>
                      {isOpen && (
                        <div className="px-2.5 pb-2.5 pt-1">
                          <p className="text-[12.5px] font-semibold text-fg-primary leading-snug">&ldquo;{r.prompt}&rdquo;</p>
                          <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mt-2">Your answer · {r.answer.trim().split(/\s+/).length} words</p>
                          <p className="text-[12.5px] text-fg-secondary whitespace-pre-wrap leading-relaxed mt-0.5">{r.answer}</p>
                          <AnswerReview card={r.scorecard} text={r.critique ?? 'No feedback saved.'} rating={r.rating} question={r.prompt} />
                          <button onClick={() => retry(r)} className="mt-2 text-[12px] text-accent hover:underline inline-flex items-center gap-1"><RotateCcw size={11} /> Retry this prompt</button>
                        </div>
                      )}
                    </li>
                  )
                })}
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
          onSave={input => { const id = editing.id; setEditing(null); startTransition(guard(async () => onSaved(await saveStory(id, input)))) }} />
      )}
      {confirmDelete && (
        <ConfirmDialog title="Delete story?" description={`"${confirmDelete.title}" will be permanently removed.`} onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { const id = confirmDelete.id; setConfirmDelete(null); onDeleted(id); startTransition(guard(() => deleteStory(id))) }} />
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

