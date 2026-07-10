'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, X, Sparkles, ChevronDown, ChevronRight, Flame, BookOpen, RotateCcw } from 'lucide-react'
import Card from '@/components/Card'
import ModuleRecommendations from '@/components/ModuleRecommendations'
import { addResource, updateResource, deleteResource, logStudySession } from '../actions'
import { getDailyStudyPlan, generateResourceQuiz } from '@/features/ai/study-plan'
import { getResourcesNeedingRevision } from '../calculations'
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

function getStreak(logs: StudyLog[]): number {
  const studyDays = new Set(logs.map(l => l.date))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (studyDays.has(d.toISOString().split('T')[0])) streak++
    else break
  }
  return streak
}

function totalMinutesThisWeek(logs: StudyLog[]): number {
  const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  return logs.filter(l => l.date >= since).reduce((s, l) => s + l.duration_minutes, 0)
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
  const [filter, setFilter] = useState<ResourceStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  // AI Study Plan
  const [showPlan, setShowPlan] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)

  // Quiz
  const [quizResource, setQuizResource] = useState<Resource | null>(null)
  const [quizItems, setQuizItems] = useState<QuizItem[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  // Log session modal
  const [showLog, setShowLog] = useState<Resource | null>(null)
  const [logDuration, setLogDuration] = useState('30')

  const today = new Date().toISOString().split('T')[0]
  const streak = getStreak(studyLogs)
  const weekMinutes = totalMinutesThisWeek(studyLogs)
  const studiedTodayIds = new Set(studyLogs.filter(l => l.date === today).map(l => l.resource_id))

  const filtered = filter === 'all' ? resources : resources.filter(r => r.status === filter)
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: resources.filter(r => r.status === s).length }), {} as Record<ResourceStatus, number>)
  const needsRevision = getResourcesNeedingRevision(resources, studyLogs)

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

  const handlePlan = async () => {
    if (planLoading) return
    if (showPlan && plan) { setShowPlan(false); return }
    setShowPlan(true); setPlanLoading(true)
    try {
      const result = await getDailyStudyPlan(resources, studyLogs)
      setPlan(result)
    } finally { setPlanLoading(false) }
  }

  const handleQuiz = async (resource: Resource) => {
    setQuizResource(resource); setQuizItems([]); setRevealed(new Set()); setQuizLoading(true)
    try {
      const items = await generateResourceQuiz(resource.title, resource.category, resource.type, resource.notes)
      setQuizItems(items)
    } finally { setQuizLoading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-slate-200">{resources.length}</span>
          <span className="text-xs text-slate-500 mt-1">Total</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-amber-400">{counts['in-progress']}</span>
          <span className="text-xs text-slate-500 mt-1">In progress</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <span className="text-2xl font-bold text-green-400">{counts['completed']}</span>
          <span className="text-xs text-slate-500 mt-1">Completed</span>
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center">
          <div className="flex items-center gap-1">
            <Flame size={16} className="text-amber-400" />
            <span className="text-2xl font-bold text-amber-400">{streak}</span>
          </div>
          <span className="text-xs text-slate-500 mt-1">{weekMinutes}m this week</span>
        </div>
      </div>

      {/* AI Daily Study Plan */}
      <div className="border border-surface-3 rounded-xl overflow-hidden">
        <button onClick={handlePlan} className="w-full flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-sm font-medium text-slate-300">AI Daily Study Plan</span>
            <span className="text-xs text-slate-600">What to focus on today</span>
          </div>
          <div className="flex items-center gap-2">
            {planLoading && <span className="text-xs text-slate-500">Generating...</span>}
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showPlan ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showPlan && (
          <div className="px-4 py-4 bg-surface-1 border-t border-surface-3">
            {planLoading
              ? <div className="space-y-2">{[85, 70, 90, 60, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>
              : plan
                ? <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{plan}</p>
                : null}
          </div>
        )}
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

      <ModuleRecommendations moduleLabel="Learning" context={`Resources tracked: ${resources.length} (${STATUSES.map(s => `${counts[s]} ${STATUS_CONFIG[s].label.toLowerCase()}`).join(', ')}). Study streak: ${getStreak(studyLogs)} days. Minutes studied this week: ${totalMinutesThisWeek(studyLogs)}. In-progress resources: ${resources.filter(r => r.status === 'in-progress').map(r => r.title).join(', ') || 'none'}. Needs revision (completed, no activity in 14+ days): ${needsRevision.map(r => r.title).join(', ') || 'none'}.`} />

      {/* Status filter + Resource list */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
          All ({resources.length})
        </button>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? `${cfg.bg} ${cfg.color}` : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
              {cfg.label} ({counts[s]})
            </button>
          )
        })}
      </div>

      <Card title="Resources" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
          <Plus size={12} /> Add
        </button>
      }>
        {filtered.length === 0 && <p className="text-sm text-slate-600 text-center py-8">Nothing here yet</p>}
        <ul className="space-y-2">
          {filtered.map(r => {
            const cfg = STATUS_CONFIG[r.status]
            const studiedToday = studiedTodayIds.has(r.id)
            return (
              <li key={r.id} className="p-3 rounded-lg bg-surface-2 border border-surface-3 group">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5 shrink-0">{TYPE_ICON[r.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{r.title}</span>
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-accent transition-colors"><ExternalLink size={11} /></a>}
                      {studiedToday && <span className="text-xs text-green-400/70 flex items-center gap-0.5"><Flame size={10} />studied today</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <select value={r.status} onChange={e => handleStatus(r.id, e.target.value as ResourceStatus)}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer font-medium ${cfg.color} ${cfg.bg}`}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      <span className="text-xs text-slate-600">{r.category}</span>
                    </div>
                    {r.status === 'in-progress' && (
                      <div className="mt-2 flex items-center gap-2">
                        <input type="range" min={0} max={100} value={r.progress}
                          onChange={e => handleProgress(r.id, parseInt(e.target.value))}
                          className="flex-1 h-1 accent-violet-500" />
                        <span className="text-xs text-slate-500 w-8 text-right">{r.progress}%</span>
                      </div>
                    )}
                    {r.status === 'completed' && (
                      <div className="mt-1.5 h-1 bg-green-500/20 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full w-full" />
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setShowLog(r)}
                        className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${studiedToday ? 'border-green-500/30 text-green-400' : 'border-surface-3 text-slate-500 hover:text-slate-300 hover:border-slate-500'}`}>
                        {studiedToday ? '✓ Logged' : '+ Log session'}
                      </button>
                      <button onClick={() => handleQuiz(r)} className="text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-accent hover:border-accent/40 transition-colors">
                        Quiz me
                      </button>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

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
                <p className="text-sm text-slate-600">Couldn't generate questions. Try adding notes to this resource for better results.</p>
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
