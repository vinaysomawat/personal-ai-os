'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, X, Sparkles, ChevronRight, ChevronDown, Flame, BookOpen, RotateCcw, Lightbulb } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { useAIAdvisor, useAIAdvisorOpen } from '@/components/AIAdvisorProvider'
import { addResource, updateResource, deleteResource, logStudySession } from '../actions'
import { getDailyStudyPlan, generateResourceQuiz } from '@/features/ai/study-plan'
import { getResourcesNeedingRevision, getStudyStreak } from '../calculations'
import { SUGGESTED_RESOURCES } from '../suggested-resources'
import type { Resource, ResourceStatus, ResourceType, StudyLog } from '../types'

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
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
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

  const today = new Date().toISOString().split('T')[0]
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
  const suggestions = SUGGESTED_RESOURCES.filter(s => !existingUrls.has(s.url) && !addedSuggestionUrls.has(s.url))

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
      category: s.category, status: 'not-started', progress: 0, notes: s.notes, created_at: new Date().toISOString(),
    }
    setResources(prev => [optimistic, ...prev])
    const fd = new FormData()
    fd.set('title', s.title); fd.set('type', s.type); fd.set('url', s.url); fd.set('category', s.category); fd.set('notes', s.notes)
    startTransition(() => addResource(fd))
  }

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
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-slate-200">{resources.length}</span>
          <span className="text-xs text-slate-500 mt-0.5">Total</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-amber-400">{counts['in-progress']}</span>
          <span className="text-xs text-slate-500 mt-0.5">In progress</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-400">{counts['completed']}</span>
          <span className="text-xs text-slate-500 mt-0.5">Completed</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-3 flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Flame size={16} className="text-amber-400" />
            <span className="text-2xl font-bold text-amber-400">{streak}</span>
          </div>
          <span className="text-xs text-slate-500 mt-0.5">{weekMinutes}m this week</span>
        </div>
      </div>

      {/* Revision nudge — rule-based, not AI: completed resources with no study activity in 14+ days */}
      {needsRevision.length > 0 && (
        <Card title="Needs Revision" action={<RotateCcw size={13} className="text-amber-400" />}>
          <p className="text-xs text-slate-500 mb-3">Completed, but no study activity in the last 14 days — worth a quick revisit.</p>
          <ul className="space-y-1.5">
            {needsRevision.map(r => (
              <li key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
                <span className="text-lg shrink-0">{TYPE_ICON[r.type]}</span>
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

      {/* Suggested resources — curated, hand-verified, not AI-generated (see suggested-resources.ts) */}
      {suggestions.length > 0 && (
        <div className="border border-surface-3 rounded-xl overflow-hidden">
          <button onClick={() => setShowSuggestions(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-slate-300">Suggested Resources</span>
              <span className="text-xs text-slate-600">{suggestions.length} curated frontend picks</span>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
          </button>
          {showSuggestions && (
            <div className="px-4 py-3 bg-surface-1 border-t border-surface-3">
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
                        <button onClick={() => handleAddSuggestion(s)}
                          className="shrink-0 text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-accent hover:border-accent/40 transition-colors">
                          + Add
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status filter — Not started + In progress collapsed into one "Not started"
          bucket (still distinguishable per-row via each resource's own status
          dropdown below), defaulting to that view instead of All */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
          All ({resources.length})
        </button>
        {([
          { key: 'active' as const, ...STATUS_CONFIG['not-started'], count: counts['not-started'] + counts['in-progress'] },
          { key: 'completed' as const, ...STATUS_CONFIG['completed'], count: counts['completed'] },
        ]).map(cfg => {
          return (
            <button key={cfg.key} onClick={() => setFilter(filter === cfg.key ? 'all' : cfg.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === cfg.key ? `${cfg.bg} ${cfg.color}` : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
              {cfg.label} ({cfg.count})
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
      <Card title="Resources" className="lg:col-span-3" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        {filtered.length === 0 && <p className="text-sm text-slate-600 text-center py-8">Nothing here yet</p>}
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
                        <button onClick={() => handleDelete(r.id)} className="text-slate-600 hover:text-red-400 transition-all">
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

      <Card title="By Category" padding="p-3" className="lg:col-span-2">
        {categoryEntries.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No resources yet</p>
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
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">Add Resource</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const newR: Resource = {
                id: `temp-${Date.now()}`, user_id: '',
                title: fd.get('title') as string, type: fd.get('type') as ResourceType,
                url: fd.get('url') as string || null, category: fd.get('category') as string || 'General',
                status: 'not-started', progress: 0, notes: fd.get('notes') as string || null,
                created_at: new Date().toISOString(),
              }
              setResources(prev => [newR, ...prev])
              setShowForm(false)
              await addResource(fd)
            }} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Title *</label>
                <input name="title" required autoFocus placeholder="The Pragmatic Programmer" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Type</label>
                  <select name="type" defaultValue="course" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Category</label>
                  <input name="category" placeholder="React, DSA, Playwright..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">URL</label>
                <input name="url" type="url" placeholder="https://..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500 uppercase tracking-wider">Notes</label>
                <textarea name="notes" rows={2} placeholder="Why you want to learn this..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log session modal */}
      {showLog !== undefined && showLog !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Log Study Session</h2>
              <button onClick={() => setShowLog(null)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
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
                <button onClick={() => handleLogSession(showLog)} className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors flex items-center justify-center gap-1.5">
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
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-200">Quiz: {quizResource.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Click an answer to reveal it</p>
              </div>
              <button onClick={() => { setQuizResource(null); setQuizItems([]) }} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
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
                      <button onClick={() => setRevealed(prev => { const n = new Set(prev); isRevealed ? n.delete(i) : n.add(i); return n })}
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
