'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, X, Sparkles, ChevronRight, ChevronDown, Flame, BookOpen, RotateCcw, Lightbulb, Inbox } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import StatCard from '@/components/StatCard'
import FilterPill from '@/components/FilterPill'
import ModuleRecommendations from '@/components/ModuleRecommendations'
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
  'not-started': { label: 'Not started', color: 'text-slate-400',  bg: 'bg-slate-500/15' },
  'in-progress':  { label: 'In progress', color: 'text-amber-400',  bg: 'bg-amber-500/15' },
  'completed':    { label: 'Completed',   color: 'text-green-400',  bg: 'bg-green-500/15' },
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
        <button onClick={() => setTab('recommendations')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'recommendations' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-300'}`}>Recommendations</button>
        <button onClick={() => setTab('plan')} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === 'plan' ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-300'}`}>Daily Plan</button>
      </div>
      {tab === 'recommendations' ? (
        <ModuleRecommendations moduleLabel="Learning" context={context} isOpen={isOpen && tab === 'recommendations'} />
      ) : planLoading ? (
        <div className="space-y-2">
          {[85, 70, 90, 60, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : plan ? (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{plan}</p>
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

  // Log session modal
  const [showLog, setShowLog] = useState<Resource | null>(null)
  const [logDuration, setLogDuration] = useState('30')

  // Suggested resources
  const [showSuggestions, setShowSuggestions] = useState(false)
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

  const handleLogSession = async (resource: Resource | null) => {
    const duration = parseInt(logDuration) || 30
    const newLog: StudyLog = {
      id: `temp-${Date.now()}`, user_id: '', date: today,
      resource_id: resource?.id ?? null, duration_minutes: duration, notes: null, created_at: new Date().toISOString(),
    }
    setStudyLogs(prev => [newLog, ...prev])
    setShowLog(null)
    await logStudySession(resource?.id ?? null, duration, null)
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
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard value={resources.length} label="Total" />
        <StatCard value={counts['in-progress']} label="In progress" valueClassName="text-amber-400" />
        <StatCard value={counts['completed']} label="Completed" valueClassName="text-green-400" />
        <StatCard value={streak} label={`${weekMinutes}m this week`} valueClassName="text-amber-400" icon={<Flame size={16} className="text-amber-400" />} />
      </div>

      {/* Revision nudge — rule-based, not AI: completed resources with no study activity in 14+ days */}
      {needsRevision.length > 0 && (
        <Card title="Needs Revision" padding="p-3.5" action={
          <span className="text-xs text-slate-500 flex items-center gap-1"><RotateCcw size={11} className="text-amber-400" /> 14+ days idle</span>
        }>
          <ul className="space-y-1">
            {needsRevision.map(r => (
              <li key={r.id} className="flex items-center gap-2 py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-surface-2 transition-colors group">
                <span className="text-sm shrink-0">{TYPE_ICON[r.type]}</span>
                <p className="flex-1 text-sm text-slate-300 truncate">{r.title}</p>
                <button onClick={() => setShowLog(r)}
                  className="text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors opacity-0 group-hover:opacity-100">
                  + Log session
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Suggested resources — curated (hand-verified URLs, not AI-generated)
          plus an on-demand AI-recommended section (no URLs — see RecommendedResource). */}
      <div className="border border-surface-3 rounded-xl overflow-hidden">
        <button onClick={() => setShowSuggestions(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Suggested Resources</span>
            <span className="text-xs text-slate-600">{suggestions.length + visibleAiSuggestions.length} picks</span>
          </div>
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
        </button>
        {showSuggestions && (
          <div className="px-4 py-3 bg-surface-1 border-t border-surface-3">
            {suggestions.length === 0 && visibleAiSuggestions.length === 0 && !aiSuggestionsLoading && (
              <p className="text-xs text-slate-600 mb-3">No curated picks left — try AI Suggested for more.</p>
            )}
            {Object.entries(
              suggestions.reduce<Record<string, typeof suggestions>>((acc, s) => {
                acc[s.category] = [...(acc[s.category] ?? []), s]
                return acc
              }, {})
            ).map(([category, items]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">{category}</p>
                <ul className="space-y-1">
                  {items.map(s => (
                    <li key={s.url} className="flex items-start gap-2 py-1 group">
                      <span className="text-base shrink-0">{TYPE_ICON[s.type]}</span>
                      <div className="flex-1 min-w-0">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-300 hover:text-accent transition-colors">
                          {s.title}
                        </a>
                        <p className="text-xs text-slate-600 mt-0.5">{s.notes}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <button onClick={() => handleAddSuggestion(s)}
                          className="text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-accent hover:border-accent/40 transition-colors">
                          + Add
                        </button>
                        <button onClick={() => handleDismissCurated(s.url)} aria-label="Remove suggestion"
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {visibleAiSuggestions.length > 0 && (
              <div className="mb-3 last:mb-0">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles size={11} className="text-accent" /> AI Suggested
                </p>
                <ul className="space-y-1">
                  {visibleAiSuggestions.map(s => (
                    <li key={s.title} className="flex items-start gap-2 py-1 group">
                      <span className="text-base shrink-0">{TYPE_ICON[s.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300">{s.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{s.reason}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <button onClick={() => handleAddAiSuggestion(s)}
                          className="text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-accent hover:border-accent/40 transition-colors">
                          + Add
                        </button>
                        <button onClick={() => handleDismissAiSuggestion(s.title)} aria-label="Remove suggestion"
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiSuggestionsLoading && (
              <div className="space-y-2 py-2">{[85, 65, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>
            )}

            <button onClick={handleAddMoreResources} disabled={aiSuggestionsLoading}
              className="w-full flex items-center justify-center gap-1.5 mt-1 py-1.5 rounded-lg border border-surface-3 text-xs text-slate-400 hover:text-accent hover:border-accent/40 disabled:opacity-50 transition-colors">
              <Sparkles size={12} className="text-accent" /> {aiSuggestionsLoading ? 'Finding resources...' : 'Add More Resources'}
            </button>
          </div>
        )}
      </div>

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
      <Card title="Resources" padding="p-3.5" className="lg:col-span-3" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        {filtered.length === 0 && <EmptyState icon={Inbox} message="Nothing here yet" cta={{ label: 'Add', onClick: () => setShowForm(true) }} compact />}
        <ul className="space-y-1">
          {filtered.map(r => {
            const cfg = STATUS_CONFIG[r.status]
            const studiedToday = studiedTodayIds.has(r.id)
            return (
              <li key={r.id} className="px-2 py-1.5 rounded-lg hover:bg-surface-2 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-base shrink-0">{TYPE_ICON[r.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200 truncate">{r.title}</span>
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-accent transition-colors shrink-0"><ExternalLink size={11} /></a>}
                      {studiedToday && <span className="text-xs text-green-400/70 flex items-center gap-0.5 shrink-0"><Flame size={10} />studied today</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <select value={r.status} onChange={e => handleStatus(r.id, e.target.value as ResourceStatus)}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer font-medium ${cfg.color} ${cfg.bg}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      <span className="text-xs text-slate-600">{r.category}</span>
                      {r.status === 'in-progress' && (
                        <span className="text-xs text-slate-500">{r.progress}%</span>
                      )}
                      <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setShowLog(r)}
                          className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${studiedToday ? 'border-green-500/30 text-green-400' : 'border-surface-3 text-slate-500 hover:text-slate-300 hover:border-slate-500'}`}>
                          {studiedToday ? '✓ Logged' : '+ Log session'}
                        </button>
                        <button onClick={() => handleQuiz(r)} className="text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-accent hover:border-accent/40 transition-colors">
                          Quiz me
                        </button>
                        <button onClick={() => handleDelete(r.id)} aria-label="Delete resource" className="p-1.5 -m-1.5 text-slate-600 hover:text-red-400 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {r.status === 'in-progress' && (
                      <input type="range" min={0} max={100} value={r.progress}
                        onChange={e => handleProgress(r.id, parseInt(e.target.value))}
                        className="w-full h-1 mt-1.5 accent-violet-500" />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card title="By Category" padding="p-3.5" className="lg:col-span-2">
        {categoryEntries.length === 0 ? (
          <EmptyState icon={BookOpen} message="No resources yet" compact />
        ) : (
          <ul className="space-y-1.5">
            {categoryEntries.map(([category, count]) => (
              <li key={category} className="py-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <p className="flex-1 text-sm text-slate-300 truncate">{category}</p>
                  <span className="text-xs text-slate-500 bg-surface-2 rounded-full px-2 py-0.5 shrink-0">{count}</span>
                </div>
                <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-accent/60 rounded-full" style={{ width: `${(count / resources.length) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>

      {/* Add resource modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">Add Resource</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="p-1.5 -m-1.5 text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
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
            }} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Title *</label>
                <input name="title" required autoFocus defaultValue={prefill?.title ?? ''} placeholder="The Pragmatic Programmer" className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors ${invalidFields.has('title') ? 'border-red-500' : 'border-surface-3'}`} />
                <FieldError show={invalidFields.has('title')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Type</label>
                  <select name="type" defaultValue={prefill?.type ?? 'course'} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Category</label>
                  <input name="category" defaultValue={prefill?.category ?? ''} placeholder="React, DSA, Playwright..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">URL{prefill && ' — AI-suggested, verify before pasting a link'}</label>
                <input name="url" type="url" placeholder="https://..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Notes</label>
                <textarea name="notes" rows={2} defaultValue={prefill?.notes ?? ''} placeholder="Why you want to learn this..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 active:scale-95 transition">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log session modal */}
      {showLog !== undefined && showLog !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Log Study Session</h2>
              <button onClick={() => setShowLog(null)} aria-label="Close" className="p-1.5 -m-1.5 text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">{showLog.title}</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Duration (minutes)</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90].map(d => (
                    <button key={d} onClick={() => setLogDuration(String(d))}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${logDuration === String(d) ? 'bg-accent text-white' : 'bg-surface-2 border border-surface-3 text-slate-400 hover:bg-surface-3'}`}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowLog(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button onClick={() => handleLogSession(showLog)} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 active:scale-95 transition flex items-center justify-center gap-1.5">
                  <Flame size={13} /> Log {logDuration}m
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz modal */}
      {quizResource && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Quiz: {quizResource.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Click an answer to reveal it</p>
              </div>
              <button onClick={() => { setQuizResource(null); setQuizItems([]) }} aria-label="Close quiz" className="p-1.5 -m-1.5 text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>

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
                <BookOpen size={32} className="mx-auto text-slate-700 mb-2" />
                <p className="text-sm text-slate-600">Couldn&apos;t generate questions. Try adding notes to this resource for better results.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizItems.map((item, i) => {
                  const isRevealed = revealed.has(i)
                  return (
                    <div key={i} className="border border-surface-3 rounded-lg overflow-hidden">
                      <div className="p-3">
                        <p className="text-sm text-slate-300 font-medium">{i + 1}. {item.question}</p>
                      </div>
                      <button onClick={() => setRevealed(prev => { const n = new Set(prev); if (isRevealed) n.delete(i); else n.add(i); return n })}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-2 border-t border-surface-3 hover:bg-surface-3 transition-colors text-left">
                        <ChevronRight size={12} className={`text-accent shrink-0 transition-transform ${isRevealed ? 'rotate-90' : ''}`} />
                        <span className="text-xs text-slate-500">{isRevealed ? 'Hide answer' : 'Show answer'}</span>
                      </button>
                      {isRevealed && (
                        <div className="px-3 pb-3 pt-2 bg-surface-2 border-t border-surface-3">
                          <p className="text-sm text-slate-400 leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button onClick={() => setRevealed(new Set(quizItems.map((_, i) => i)))} className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Reveal all answers
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
