'use client'

import { useState, useEffect, useTransition } from 'react'
import { ExternalLink, Sparkles, ChevronRight, Flame, BookOpen, Inbox } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import StatCard from '@/components/StatCard'
import FilterPill from '@/components/FilterPill'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { addResource, updateResource, deleteResource, logStudySession } from '../actions'
import { getDailyStudyPlan, generateResourceQuiz, recommendResources } from '@/features/ai/study-plan'
import { getResourcesNeedingRevision, getStudyStreak } from '../calculations'
import { SUGGESTED_RESOURCES } from '../suggested-resources'
import { todayIST, daysAgoIST } from '@/lib/date'
import { useEscapeKey } from '@/lib/use-escape-key'
import { useFormValidation } from '@/lib/use-form-validation'
import FieldError from '@/components/FieldError'
import type { Resource, ResourceStatus, ResourceType, StudyLog, RecommendedResource } from '../types'

const TYPE_ICON: Record<ResourceType, string> = {
  course: '🎓', book: '📚', video: '🎬', article: '📄', podcast: '🎙️',
}
const STATUS_CONFIG: Record<ResourceStatus, { label: string; color: string; bg: string }> = {
  'not-started': { label: 'Not started', color: 'text-fg-secondary',  bg: 'bg-surface-2' },
  'in-progress':  { label: 'In progress', color: 'text-amber-400',  bg: 'bg-warn-soft' },
  'completed':    { label: 'Completed',   color: 'text-green-400',  bg: 'bg-good-soft' },
}
const STATUSES = Object.keys(STATUS_CONFIG) as ResourceStatus[]
const TYPES: ResourceType[] = ['course', 'book', 'video', 'article', 'podcast']

function totalMinutesThisWeek(logs: StudyLog[]): number {
  const since = daysAgoIST(7)
  return logs.filter(l => l.date >= since).reduce((s, l) => s + l.duration_minutes, 0)
}

// Merges the generic recommendations widget + the daily study plan into one
// tabbed panel registered as the "Study Coach" advisor (see AIAdvisorProvider).
function StudyCoachContent({ isOpen, context, resources, studyLogs }: { isOpen: boolean; context: string; resources: Resource[]; studyLogs: StudyLog[] }) {
  const [tab, setTab] = useState<'recommendations' | 'plan'>('recommendations')
  const [plan, setPlan] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)

  useEffect(() => {
    if (isOpen && tab === 'plan' && !plan && !planLoading) {
      setPlanLoading(true)
      getDailyStudyPlan(resources, studyLogs).then(setPlan).finally(() => setPlanLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab])

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-surface-2 rounded-lg p-0.5">
        <button onClick={() => setTab('recommendations')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'recommendations' ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>Recommendations</button>
        <button onClick={() => setTab('plan')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'plan' ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>Daily Plan</button>
      </div>
      {tab === 'recommendations' ? (
        <ModuleRecommendations moduleLabel="Learning" context={context} isOpen={isOpen && tab === 'recommendations'} />
      ) : planLoading ? (
        <div className="space-y-2">
          {[85, 70, 90, 60, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : plan ? (
        <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">{plan}</p>
      ) : null}
    </div>
  )
}

interface QuizItem { question: string; answer: string }

interface Props {
  initialResources: Resource[]
  initialStudyLogs: StudyLog[]
}

export default function LearningView({ initialResources, initialStudyLogs }: Props) {
  const [, startTransition] = useTransition()
  const [resources, setResources] = useState(initialResources)
  const [studyLogs, setStudyLogs] = useState(initialStudyLogs)
  const [filter, setFilter] = useState<'active' | 'all' | 'completed'>('active')
  const [showForm, setShowForm] = useState(false)

  // Quiz
  const [quizResource, setQuizResource] = useState<Resource | null>(null)
  const [quizItems, setQuizItems] = useState<QuizItem[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  // Log session modal — 'general' logs study time not tied to any resource
  // (design's header-level "Log Session" button, distinct from per-resource logging)
  const [showLog, setShowLog] = useState<Resource | 'general' | null>(null)
  const [logDuration, setLogDuration] = useState('30')
  const [logNotes, setLogNotes] = useState('')

  // Suggested resources
  const [addedSuggestionUrls, setAddedSuggestionUrls] = useState<Set<string>>(new Set())
  const [dismissedCuratedUrls, setDismissedCuratedUrls] = useState<Set<string>>(new Set())

  // AI-recommended resources — no url (see RecommendedResource), so "+ Add"
  // opens the Add Resource form pre-filled instead of inserting directly.
  const [aiSuggestions, setAiSuggestions] = useState<RecommendedResource[]>([])
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
  const [handledAiTitles, setHandledAiTitles] = useState<Set<string>>(new Set())
  const [prefill, setPrefill] = useState<{ title: string; type: ResourceType; category: string; notes: string } | null>(null)

  useEscapeKey(() => {
    if (showForm) setShowForm(false)
    if (showLog) setShowLog(null)
    if (quizResource) setQuizResource(null)
  })
  const { invalidFields, validate, clear, onFieldInput } = useFormValidation()
  useEffect(() => { clear(); if (!showForm) setPrefill(null) }, [showForm, clear])

  const today = todayIST()
  const streak = getStudyStreak(studyLogs)
  const weekMinutes = totalMinutesThisWeek(studyLogs)
  const studiedTodayIds = new Set(studyLogs.filter(l => l.date === today).map(l => l.resource_id))

  const filtered = filter === 'all' ? resources
    : filter === 'completed' ? resources.filter(r => r.status === 'completed')
    : resources.filter(r => r.status !== 'completed')
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: resources.filter(r => r.status === s).length }), {} as Record<ResourceStatus, number>)
  const needsRevision = getResourcesNeedingRevision(resources, studyLogs)

  const byCategory = resources.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1
    return acc
  }, {})
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  const existingUrls = new Set(resources.map(r => r.url).filter(Boolean))
  const suggestions = SUGGESTED_RESOURCES.filter(s => !existingUrls.has(s.url) && !addedSuggestionUrls.has(s.url) && !dismissedCuratedUrls.has(s.url))
  const visibleAiSuggestions = aiSuggestions.filter(s => !handledAiTitles.has(s.title))

  const handleStatus = (id: string, status: ResourceStatus) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, status, progress: status === 'completed' ? 100 : r.progress } : r))
    startTransition(() => updateResource(id, { status, ...(status === 'completed' ? { progress: 100 } : {}) }))
  }

  const handleProgress = (id: string, progress: number) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, progress } : r))
    startTransition(() => updateResource(id, { progress }))
  }

  const handleDelete = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id))
    startTransition(() => deleteResource(id))
  }

  const handleAddSuggestion = (s: typeof SUGGESTED_RESOURCES[number]) => {
    setAddedSuggestionUrls(prev => new Set(prev).add(s.url))
    const optimistic: Resource = {
      id: `temp-${Date.now()}`, user_id: '', title: s.title, type: s.type, url: s.url,
      category: s.category, status: 'not-started', progress: 0, notes: s.notes, created_at: new Date().toISOString(), task_id: null,
    }
    setResources(prev => [optimistic, ...prev])
    const fd = new FormData()
    fd.set('title', s.title); fd.set('type', s.type); fd.set('url', s.url); fd.set('category', s.category); fd.set('notes', s.notes)
    startTransition(() => addResource(fd))
  }

  const handleDismissCurated = (url: string) => setDismissedCuratedUrls(prev => new Set(prev).add(url))

  const handleAddMoreResources = async () => {
    setAiSuggestionsLoading(true)
    try {
      const excludeTitles = [
        ...resources.map(r => r.title),
        ...aiSuggestions.map(r => r.title),
      ]
      const recs = await recommendResources(resources, excludeTitles)
      setAiSuggestions(prev => [...prev, ...recs])
    } finally {
      setAiSuggestionsLoading(false)
    }
  }

  // AI suggestions never carry a URL — open the Add Resource form pre-filled
  // instead of inserting directly, so the user supplies (or skips) a real link.
  // Only marked "handled" on actual submit (see the form below), not on open,
  // so cancelling the modal leaves the suggestion available to add later.
  const handleAddAiSuggestion = (s: RecommendedResource) => {
    setPrefill({ title: s.title, type: s.type, category: s.category, notes: s.reason })
    setShowForm(true)
  }

  const handleDismissAiSuggestion = (title: string) => setHandledAiTitles(prev => new Set(prev).add(title))

  const handleLogSession = async (resource: Resource | 'general' | null) => {
    const resourceObj = resource === 'general' ? null : resource
    const duration = parseInt(logDuration) || 30
    const notes = logNotes.trim() || null
    const newLog: StudyLog = {
      id: `temp-${Date.now()}`, user_id: '', date: today,
      resource_id: resourceObj?.id ?? null, duration_minutes: duration, notes, created_at: new Date().toISOString(),
    }
    setStudyLogs(prev => [newLog, ...prev])
    setShowLog(null)
    setLogNotes('')
    await logStudySession(resourceObj?.id ?? null, duration, notes)
  }

  const handleQuiz = async (resource: Resource) => {
    setQuizResource(resource); setQuizItems([]); setRevealed(new Set()); setQuizLoading(true)
    try {
      const items = await generateResourceQuiz(resource.title, resource.category, resource.type, resource.notes)
      setQuizItems(items)
    } finally { setQuizLoading(false) }
  }

  const learningContext = `Resources tracked: ${resources.length} (${STATUSES.map(s => `${counts[s]} ${STATUS_CONFIG[s].label.toLowerCase()}`).join(', ')}). Study streak: ${streak} days. Minutes studied this week: ${weekMinutes}. In-progress resources: ${resources.filter(r => r.status === 'in-progress').map(r => r.title).join(', ') || 'none'}. Needs revision (completed, no activity in 14+ days): ${needsRevision.map(r => r.title).join(', ') || 'none'}.`

  const advisorOpen = useAIAdvisorOpen()
  const advisorPortal = useAIAdvisor('Study Coach', Sparkles, (
    <StudyCoachContent isOpen={advisorOpen} context={learningContext} resources={resources} studyLogs={studyLogs} />
  ))

  return (
    <div className="space-y-5">
      {advisorPortal}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.02em] text-fg-primary">Learning</h1>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">📚 {streak}-day study streak</span>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">📖 {counts['in-progress']} in progress</span>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard value={resources.length} label="Total" />
        <StatCard value={counts['in-progress']} label="In progress" valueClassName="text-amber-400" />
        <StatCard value={counts['completed']} label="Completed" valueClassName="text-green-400" />
        <StatCard value={`${streak}d`} label={`Streak · ${weekMinutes}m this week`} valueClassName="text-amber-400" icon={<Flame size={16} className="text-amber-400" />} />
      </div>

      {/* Revision nudge — rule-based, not AI: completed resources with no study activity in 14+ days */}
      {needsRevision.length > 0 && (
        <div className="rounded-2xl bg-risk-soft border border-risk-border px-5 py-3.5">
          <ul className="flex flex-col gap-2">
            {needsRevision.map(r => (
              <li key={r.id} className="flex items-center gap-3 flex-wrap">
                <p className="flex-1 min-w-0 text-[13px] text-risk-strong truncate">📚 &quot;{r.title}&quot; not revised in 14+ days</p>
                <button onClick={() => setShowLog(r)}
                  className="shrink-0 px-3 py-1.5 rounded-[7px] border border-risk-border text-xs text-risk-strong hover:bg-risk-soft/50 transition-colors whitespace-nowrap">
                  + Log Session
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status filter — Not started + In progress collapsed into one "Not started"
          bucket (still distinguishable per-row via each resource's own status
          dropdown below), defaulting to that view instead of All */}
      <div className="flex gap-2 flex-wrap">
        <FilterPill label={`All (${resources.length})`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {([
          { key: 'active' as const, ...STATUS_CONFIG['not-started'], count: counts['not-started'] + counts['in-progress'] },
          { key: 'completed' as const, ...STATUS_CONFIG['completed'], count: counts['completed'] },
        ]).map(cfg => (
          <FilterPill key={cfg.key} label={`${cfg.label} (${cfg.count})`} active={filter === cfg.key}
            onClick={() => setFilter(filter === cfg.key ? 'all' : cfg.key)} activeClassName={`${cfg.bg} ${cfg.color}`} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
      <Card title="Resources" className="lg:col-span-3" action={
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLog('general')} className="px-2.5 py-1 rounded-[6px] border border-border-strong text-[11.5px] text-fg-secondary hover:bg-surface-2 transition-colors whitespace-nowrap">
            Log Session
          </button>
          <button onClick={() => setShowForm(true)} className="px-2.5 py-1 rounded-[6px] bg-accent text-white text-[11.5px] font-semibold hover:bg-accent/80 transition-colors whitespace-nowrap">
            + Add Resource
          </button>
        </div>
      }>
        {filtered.length === 0 && <EmptyState icon={Inbox} message="Nothing here yet" cta={{ label: 'Add', onClick: () => setShowForm(true) }} compact />}
        <ul className="flex flex-col gap-2.5">
          {filtered.map(r => {
            const studiedToday = studiedTodayIds.has(r.id)
            return (
              <li key={r.id} className="bg-surface-2 rounded-[10px] px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base shrink-0">{TYPE_ICON[r.type]}</span>
                  <span className="text-[13px] font-semibold text-fg-primary flex-1 min-w-0 truncate">{r.title}</span>
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-fg-quaternary hover:text-accent transition-colors shrink-0"><ExternalLink size={11} /></a>}
                  {studiedToday && <span className="text-xs text-green-400/70 flex items-center gap-0.5 shrink-0"><Flame size={10} />studied today</span>}
                  <select value={r.status} onChange={e => handleStatus(r.id, e.target.value as ResourceStatus)}
                    className="text-[11px] px-2 py-0.5 rounded-[6px] border border-border-strong outline-none cursor-pointer font-semibold bg-transparent shrink-0"
                    style={{ color: r.status === 'completed' ? 'var(--good)' : r.status === 'in-progress' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                  <button onClick={() => setShowLog(r)}
                    className="shrink-0 text-[11px] px-2 py-0.5 rounded-[6px] border border-border-strong text-fg-secondary hover:bg-surface-3 transition-colors whitespace-nowrap">
                    {studiedToday ? '✓ Logged' : 'Log'}
                  </button>
                  <button onClick={() => handleQuiz(r)} className="shrink-0 text-[11px] px-2 py-0.5 rounded-[6px] border border-border-strong text-fg-secondary hover:bg-surface-3 transition-colors">
                    Quiz me
                  </button>
                  <button onClick={() => handleDelete(r.id)} aria-label="Delete resource" className="shrink-0 text-fg-quaternary hover:text-red-400 text-[11px] p-0.5 transition-colors">✕</button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 pl-[26px]">
                  <span className="text-xs text-fg-quaternary shrink-0">{r.category}</span>
                </div>
                <div className="h-[5px] rounded-[3px] bg-border mt-2">
                  <div className="h-full rounded-[3px] bg-accent" style={{ width: `${r.status === 'completed' ? 100 : r.status === 'in-progress' ? r.progress : 0}%` }} />
                </div>
                {r.status === 'in-progress' && (
                  <input type="range" min={0} max={100} value={r.progress}
                    onChange={e => handleProgress(r.id, parseInt(e.target.value))}
                    className="w-full h-1 mt-2 accent-violet-500" />
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title="By Category" className="lg:col-span-2">
        {categoryEntries.length === 0 ? (
          <EmptyState icon={BookOpen} message="No resources yet" compact />
        ) : (
          <ul className="flex flex-col gap-1">
            {categoryEntries.map(([category, count]) => (
              <li key={category} className="flex items-center justify-between text-[12.5px] text-fg-secondary py-[5px]">
                <span className="truncate">{category}</span>
                <span className="shrink-0">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>

      {/* Suggested Resources — curated (hand-verified URLs) + on-demand AI picks,
          matching design's flat (non-category-grouped) list and tinted-row style. */}
      <Card title="Suggested Resources">
        <p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2">Curated</p>
        <div className="flex flex-col gap-2">
          {suggestions.map(s => (
            <div key={s.url} className="flex items-center gap-2.5 bg-surface-2 rounded-[10px] px-3.5 py-2.5">
              <div className="flex-1 min-w-0">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-fg-primary hover:text-accent transition-colors">{s.title}</a>
                <p className="text-[11px] text-fg-tertiary mt-0.5 truncate">{s.category}</p>
              </div>
              <button onClick={() => handleAddSuggestion(s)} className="shrink-0 px-2.5 py-1 rounded-[6px] bg-accent text-white text-[11px] font-semibold hover:bg-accent/80 transition-colors whitespace-nowrap">+ Add</button>
              <button onClick={() => handleDismissCurated(s.url)} aria-label="Remove suggestion" className="shrink-0 text-fg-quaternary hover:text-red-400 text-xs p-1 transition-colors">✕</button>
            </div>
          ))}
          {suggestions.length === 0 && (
            <p className="text-[12.5px] text-fg-tertiary py-1">No more suggestions right now.</p>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 mb-2">
          <p className="text-[10.5px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">AI Suggested</p>
          {aiSuggestions.length === 0 && (
            <button onClick={handleAddMoreResources} disabled={aiSuggestionsLoading}
              className="px-2.5 py-1 rounded-[6px] border border-border-strong text-[11px] text-fg-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors whitespace-nowrap">
              {aiSuggestionsLoading ? 'Finding resources...' : 'Add More Resources'}
            </button>
          )}
        </div>
        {aiSuggestions.length === 0 && !aiSuggestionsLoading && (
          <p className="text-xs text-fg-tertiary">Click &quot;Add More Resources&quot; for AI picks based on your progress and weak areas.</p>
        )}
        {aiSuggestionsLoading && (
          <div className="space-y-2 py-1">{[85, 65, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>
        )}
        <div className="flex flex-col gap-2">
          {visibleAiSuggestions.map(s => (
            <div key={s.title} className="flex items-center gap-2.5 bg-accent-soft rounded-[10px] px-3.5 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-fg-primary">{s.title}</p>
                <p className="text-[11px] text-fg-tertiary mt-0.5">{s.reason}</p>
              </div>
              <button onClick={() => handleAddAiSuggestion(s)} className="shrink-0 px-2.5 py-1 rounded-[6px] bg-accent text-white text-[11px] font-semibold hover:bg-accent/80 transition-colors whitespace-nowrap">+ Add</button>
              <button onClick={() => handleDismissAiSuggestion(s.title)} aria-label="Remove suggestion" className="shrink-0 text-fg-quaternary hover:text-red-400 text-xs p-1 transition-colors">✕</button>
            </div>
          ))}
        </div>
        {aiSuggestions.length > 0 && (
          <button onClick={handleAddMoreResources} disabled={aiSuggestionsLoading}
            className="mt-2 px-2.5 py-1 rounded-[6px] border border-border-strong text-[11px] text-fg-secondary hover:bg-surface-2 disabled:opacity-50 transition-colors">
            {aiSuggestionsLoading ? 'Finding resources...' : 'Add More Resources'}
          </button>
        )}
      </Card>

      {/* Add resource modal */}
      {showForm && (
        <Modal title="Add Resource" onClose={() => setShowForm(false)}>
            <form noValidate onInput={onFieldInput} onSubmit={async e => {
              e.preventDefault()
              if (!validate(e.currentTarget)) return
              const fd = new FormData(e.currentTarget)
              const newR: Resource = {
                id: `temp-${Date.now()}`, user_id: '',
                title: fd.get('title') as string, type: fd.get('type') as ResourceType,
                url: fd.get('url') as string || null, category: fd.get('category') as string || 'General',
                status: 'not-started', progress: 0, notes: fd.get('notes') as string || null,
                created_at: new Date().toISOString(), task_id: null,
              }
              setResources(prev => [newR, ...prev])
              if (prefill) setHandledAiTitles(p => new Set(p).add(prefill.title))
              setShowForm(false)
              await addResource(fd)
            }} className="flex flex-col gap-3.5">
              <div>
                <label className={modalLabelClass}>Title</label>
                <input name="title" required autoFocus defaultValue={prefill?.title ?? ''} placeholder="e.g. Advanced React Patterns" className={modalInputClass(invalidFields.has('title'))} />
                <FieldError show={invalidFields.has('title')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabelClass}>Type</label>
                  <select name="type" defaultValue={prefill?.type ?? 'course'} className={modalSelectClass}>
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={modalLabelClass}>Category</label>
                  <input name="category" defaultValue={prefill?.category ?? ''} placeholder="e.g. React" className={modalInputClass()} />
                </div>
              </div>
              <div>
                <label className={modalLabelClass}>URL{prefill && ' — AI-suggested, verify before pasting a link'}</label>
                <input name="url" type="url" placeholder="https://..." className={modalInputClass()} />
              </div>
              <div>
                <label className={modalLabelClass}>Notes</label>
                <textarea name="notes" rows={2} defaultValue={prefill?.notes ?? ''} placeholder="Why you want to learn this..." className={`${modalInputClass()} resize-none`} />
              </div>
              <div className="flex justify-end gap-2.5 mt-1.5">
                <button type="button" onClick={() => setShowForm(false)} className={modalCancelButtonClass}>Cancel</button>
                <button type="submit" className={modalSaveButtonClass}>Save</button>
              </div>
            </form>
        </Modal>
      )}

      {/* Log session modal */}
      {showLog !== null && (
        <Modal title="Log Study Session" onClose={() => setShowLog(null)}>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className={modalLabelClass}>Resource</label>
                <p className="text-[13px] text-fg-primary">{showLog === 'general' ? 'General study time (no specific resource)' : showLog.title}</p>
              </div>
              <div>
                <label className={modalLabelClass}>Duration</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90].map(d => (
                    <button key={d} onClick={() => setLogDuration(String(d))}
                      className={`rounded-[7px] px-3 py-[7px] text-[12.5px] transition-colors ${logDuration === String(d) ? 'bg-accent text-white' : 'bg-surface-2 border border-surface-3 text-fg-primary hover:bg-surface-3'}`}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={modalLabelClass}>Notes</label>
                <input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="optional" className={modalInputClass()} />
              </div>
              <div className="flex justify-end gap-2.5 mt-1.5">
                <button onClick={() => setShowLog(null)} className={modalCancelButtonClass}>Cancel</button>
                <button onClick={() => handleLogSession(showLog)} className={`${modalSaveButtonClass} flex items-center gap-1.5`}>
                  <Flame size={13} /> Log {logDuration}m
                </button>
              </div>
            </div>
        </Modal>
      )}

      {/* Quiz modal */}
      {quizResource && (
        <Modal title={`Quiz: ${quizResource.title}`} onClose={() => { setQuizResource(null); setQuizItems([]) }}>
            <p className="text-xs text-fg-tertiary -mt-2 mb-3">Click an answer to reveal it</p>

            {quizLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="p-4 bg-surface-2 rounded-lg space-y-2">
                    <div className="h-3 bg-surface-3 rounded animate-pulse" style={{ width: '80%' }} />
                    <div className="h-3 bg-surface-3 rounded animate-pulse" style={{ width: '60%' }} />
                  </div>
                ))}
              </div>
            ) : quizItems.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen size={32} className="mx-auto text-fg-quaternary mb-2" />
                <p className="text-sm text-fg-quaternary">Couldn&apos;t generate questions. Try adding notes to this resource for better results.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizItems.map((item, i) => {
                  const isRevealed = revealed.has(i)
                  return (
                    <div key={i} className="border border-surface-3 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <p className="text-sm text-fg-secondary font-medium">{i + 1}. {item.question}</p>
                      </div>
                      <button onClick={() => setRevealed(prev => { const n = new Set(prev); if (isRevealed) n.delete(i); else n.add(i); return n })}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-2 border-t border-surface-3 hover:bg-surface-3 transition-colors text-left">
                        <ChevronRight size={12} className={`text-accent shrink-0 transition-transform ${isRevealed ? 'rotate-90' : ''}`} />
                        <span className="text-xs text-fg-tertiary">{isRevealed ? 'Hide answer' : 'Show answer'}</span>
                      </button>
                      {isRevealed && (
                        <div className="px-3 pb-3 pt-2 bg-surface-2 border-t border-surface-3">
                          <p className="text-sm text-fg-secondary leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button onClick={() => setRevealed(new Set(quizItems.map((_, i) => i)))} className="w-full py-2 text-xs text-fg-quaternary hover:text-fg-secondary transition-colors">
                  Reveal all answers
                </button>
              </div>
            )}
        </Modal>
      )}
    </div>
  )
}
