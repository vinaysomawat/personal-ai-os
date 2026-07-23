'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, ExternalLink, X, Sparkles, ChevronRight, ChevronDown, Pencil, Check, Wand2, RotateCcw, Lightbulb, HelpCircle, Briefcase, Eye, EyeOff } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import FilterPill from '@/components/FilterPill'
import { useAIAdvisor } from '@/components/AIAdvisorProvider'
import { todayIST } from '@/lib/date'
import {
  addApplication, updateStatus, deleteApplication, saveApplicationJD,
  upsertCareerProfile,
  addInterviewQA, updateQAAnswer, deleteInterviewQA, markQAReviewed,
} from '../actions'
import { askCareerMentor, generateInterviewQuestions, analyzeJobDescription } from '@/features/ai/career-mentor'
import { getQAsNeedingRevision } from '../calculations'
import { SUGGESTED_QUESTIONS } from '../suggested-questions'
import type { Application, AppStatus, CareerProfile, Skill, InterviewQA, Difficulty } from '../types'
import { DIFFICULTY_CONFIG, QA_TOPICS } from '../types'
import { useEscapeKey } from '@/lib/use-escape-key'
import { useFormValidation } from '@/lib/use-form-validation'
import FieldError from '@/components/FieldError'
import GoalsCard from '@/features/goals/components/GoalsCard'
import type { ResolvedGoal } from '@/features/goals/types'

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  applied:   { label: 'Applied',   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  screening: { label: 'Screening', color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  interview: { label: 'Interview', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  offer:     { label: 'Offer',     color: 'text-green-400',  bg: 'bg-green-500/10' },
  rejected:  { label: 'Rejected',  color: 'text-red-400',    bg: 'bg-red-400/10' },
}
const STATUSES = Object.keys(STATUS_CONFIG) as AppStatus[]

function matchColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500/15 text-green-400'
  if (pct >= 40) return 'bg-amber-500/15 text-amber-400'
  return 'bg-red-500/15 text-red-400'
}

function ProfileField({ label, value, onSave, type = 'text', placeholder, masked = false }: {
  label: string; value: string; onSave: (v: string) => void; type?: string; placeholder?: string; masked?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value)
  const [revealed, setRevealed] = useState(false)

  if (masked && !editing && !revealed) return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <button onClick={() => setRevealed(true)} aria-label="Reveal value" className="p-1.5 -m-1.5 text-slate-600 hover:text-slate-400 transition-colors">
          <Eye size={11} />
        </button>
      </div>
      <p className="text-sm font-medium text-slate-200 tracking-widest">••••••</p>
    </div>
  )

  if (!editing) return (
    <div className="text-left w-full group">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        {masked && (
          <button onClick={() => setRevealed(false)} aria-label="Hide value" className="p-1.5 -m-1.5 text-slate-600 hover:text-slate-400 transition-colors">
            <EyeOff size={11} />
          </button>
        )}
      </div>
      <button onClick={() => { setInput(value); setEditing(true) }} className="text-left w-full">
        <p className={`text-sm font-medium flex items-center gap-1 ${value ? 'text-slate-200' : 'text-slate-600'}`}>
          {value || `Set ${label.toLowerCase()}`}
          <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
        </p>
      </button>
    </div>
  )
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <input value={input} onChange={e => setInput(e.target.value)} type={type} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { onSave(input); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          autoFocus className="flex-1 bg-surface-2 border border-accent rounded px-2 py-1 text-sm text-slate-200 outline-none" />
        <button onClick={() => { onSave(input); setEditing(false) }} aria-label="Save" className="p-1.5 -m-1.5 text-green-400 shrink-0"><Check size={12} /></button>
        <button onClick={() => setEditing(false)} aria-label="Cancel edit" className="p-1.5 -m-1.5 text-slate-600 shrink-0"><X size={12} /></button>
      </div>
    </div>
  )
}

interface Props {
  applications: Application[]
  profile: CareerProfile | null
  skills: Skill[]
  qa: InterviewQA[]
  codingStreak: number
  studyStreak: number
  goals: ResolvedGoal[]
}

export default function CareerView({ applications, profile, skills, qa, codingStreak, studyStreak, goals }: Props) {
  const [, startTransition] = useTransition()

  const [localApps, setLocalApps] = useState(applications)
  const [localQA, setLocalQA] = useState(qa)
  const [localProfile, setLocalProfile] = useState(profile)

  const [filterStatus, setFilterStatus] = useState<AppStatus | 'all'>('all')
  const [filterTopic, setFilterTopic] = useState<string>('all')
  const [modal, setModal] = useState<'app' | 'qa' | 'generate' | null>(null)
  useEscapeKey(() => setModal(null))
  const { invalidFields, validate, clear, onFieldInput } = useFormValidation()
  useEffect(() => clear(), [modal, clear])
  const [expandedQA, setExpandedQA] = useState<string | null>(null)
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null)
  const [answerInput, setAnswerInput] = useState('')

  // JD analysis
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [analyzingAppId, setAnalyzingAppId] = useState<string | null>(null)
  const [jdInput, setJdInput] = useState('')

  // AI Mentor
  const [mentorQ, setMentorQ] = useState('')
  const [mentorA, setMentorA] = useState<string | null>(null)
  const [mentorLoading, setMentorLoading] = useState(false)

  // AI Generate
  const [genLoading, setGenLoading] = useState(false)

  // Suggested questions
  const [showSuggestedQuestions, setShowSuggestedQuestions] = useState(false)
  const [addedSuggestedQuestions, setAddedSuggestedQuestions] = useState<Set<string>>(new Set())

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: localApps.filter(a => a.status === s).length }), {} as Record<AppStatus, number>)
  const filtered = filterStatus === 'all' ? localApps : localApps.filter(a => a.status === filterStatus)
  const filteredQA = filterTopic === 'all' ? localQA : localQA.filter(q => q.topic === filterTopic)
  const needsRevisionQA = getQAsNeedingRevision(localQA)

  const existingQuestions = new Set(localQA.map(q => q.question))
  const suggestedQuestions = SUGGESTED_QUESTIONS.filter(s => !existingQuestions.has(s.question) && !addedSuggestedQuestions.has(s.question))

  const saveProfile = (field: keyof CareerProfile, raw: string) => {
    const value = ['current_salary', 'years_experience'].includes(field) ? (parseFloat(raw) || null) : raw
    setLocalProfile(p => ({ id: '', user_id: '', current_role: null, current_company: null, current_salary: null, target_role: null, years_experience: null, bio: null, updated_at: '', ...p, [field]: value }))
    startTransition(() => upsertCareerProfile({ [field]: value }))
  }

  const handleDeleteApp = (id: string) => {
    setLocalApps(prev => prev.filter(a => a.id !== id))
    startTransition(() => deleteApplication(id))
  }
  const handleStatus = (id: string, status: AppStatus) => {
    setLocalApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    startTransition(() => updateStatus(id, status))
  }

  const handleAddApplication = async (fd: FormData) => {
    const tempId = `temp-${Date.now()}`
    const company = fd.get('company') as string
    const role = fd.get('role') as string
    const jobDescription = fd.get('job_description') as string
    const newApp: Application = {
      id: tempId, user_id: '',
      company, role,
      status: (fd.get('status') as AppStatus) ?? 'applied',
      salary_range: fd.get('salary_range') as string || null,
      location: fd.get('location') as string || null,
      url: fd.get('url') as string || null,
      notes: fd.get('notes') as string || null,
      applied_at: fd.get('applied_at') as string || todayIST(),
      created_at: new Date().toISOString(),
      resume_version_id: null,
      job_description: jobDescription,
      jd_analysis: null,
    }
    setLocalApps(prev => [newApp, ...prev])
    setModal(null)

    const inserted = await addApplication(fd)
    setLocalApps(prev => prev.map(a => a.id === tempId ? { ...a, id: inserted.id } : a))

    setAnalyzingAppId(inserted.id)
    const analysis = await analyzeJobDescription(jobDescription, company, role, localProfile)
    setLocalApps(prev => prev.map(a => a.id === inserted.id ? { ...a, jd_analysis: analysis } : a))
    setAnalyzingAppId(null)
    await saveApplicationJD(inserted.id, jobDescription, analysis)
  }

  const handleAnalyzeJD = async (id: string, jd: string) => {
    const app = localApps.find(a => a.id === id)
    if (!app) return
    setAnalyzingAppId(id)
    setJdInput('')
    const analysis = await analyzeJobDescription(jd, app.company, app.role, localProfile)
    setLocalApps(prev => prev.map(a => a.id === id ? { ...a, job_description: jd, jd_analysis: analysis } : a))
    setAnalyzingAppId(null)
    await saveApplicationJD(id, jd, analysis)
  }

  const handleDeleteQA = (id: string) => {
    setLocalQA(prev => prev.filter(q => q.id !== id))
    startTransition(() => deleteInterviewQA(id))
  }
  const handleAddSuggestedQuestion = (s: typeof SUGGESTED_QUESTIONS[number]) => {
    setAddedSuggestedQuestions(prev => new Set(prev).add(s.question))
    const optimistic: InterviewQA = {
      id: `temp-${Date.now()}`, user_id: '', question: s.question, answer: null,
      topic: s.topic, difficulty: s.difficulty, created_at: new Date().toISOString(), last_reviewed_at: null,
    }
    setLocalQA(prev => [optimistic, ...prev])
    startTransition(() => addInterviewQA(s.question, null, s.topic, s.difficulty))
  }
  const handleAnswerSave = (id: string) => {
    setLocalQA(prev => prev.map(q => q.id === id ? { ...q, answer: answerInput } : q))
    startTransition(() => updateQAAnswer(id, answerInput))
    setEditingAnswer(null)
  }
  const handleMarkReviewed = (id: string) => {
    const now = new Date().toISOString()
    setLocalQA(prev => prev.map(q => q.id === id ? { ...q, last_reviewed_at: now } : q))
    startTransition(() => markQAReviewed(id))
  }

  const handleAsk = async () => {
    if (!mentorQ.trim() || mentorLoading) return
    setMentorLoading(true); setMentorA(null)
    try {
      const answer = await askCareerMentor(mentorQ, { profile: localProfile, skills, applications: localApps, codingStreak, studyStreak })
      setMentorA(answer)
    } finally { setMentorLoading(false) }
  }

  const handleGenerate = async (topic: string, difficulty: string) => {
    setGenLoading(true); setModal(null)
    try {
      const targetRole = localProfile?.target_role ?? 'Senior Frontend Engineer'
      const questions = await generateInterviewQuestions(targetRole, topic, difficulty)
      if (questions.length) {
        const newQAs = questions.map(q => ({ id: `temp-${Date.now()}-${Math.random()}`, user_id: '', question: q.question, answer: q.answer, topic, difficulty: difficulty as Difficulty, created_at: new Date().toISOString(), last_reviewed_at: null }))
        setLocalQA(prev => [...newQAs, ...prev])
        for (const q of questions) {
          await addInterviewQA(q.question, q.answer, topic, difficulty as Difficulty)
        }
      }
    } finally { setGenLoading(false) }
  }

  const QUICK_PROMPTS = [
    `Am I ready for ${localProfile?.target_role ?? 'Staff Engineer'}?`,
    'What skills should I learn next?',
    'How do I increase my salary?',
    'What are my biggest career gaps?',
  ]

  const advisorPortal = useAIAdvisor('Career Mentor', Sparkles, (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map(q => (
          <button key={q} onClick={() => setMentorQ(q)} className="text-xs text-slate-600 px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-slate-400 transition-colors">{q}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={mentorQ} onChange={e => setMentorQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="Am I ready for a promotion? What should I learn next?" disabled={mentorLoading}
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
        <button onClick={handleAsk} disabled={mentorLoading || !mentorQ.trim()} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
          {mentorLoading ? '...' : 'Ask'}
        </button>
      </div>
      {mentorLoading && <div className="space-y-2">{[85, 70, 90, 60].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
      {mentorA && <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-3">{mentorA}</p>}
    </div>
  ))

  return (
    <div className="space-y-5">
      {advisorPortal}

      {/* Applications Pipeline */}
      <div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s]
            return (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${filterStatus === s ? `${cfg.bg} border-current ${cfg.color}` : 'bg-surface-1 border-surface-3 text-slate-400 hover:bg-surface-2'}`}>
                <span className="text-xl font-bold">{counts[s]}</span>
                <span className="text-xs mt-0.5">{cfg.label}</span>
              </button>
            )
          })}
        </div>
        <Card title={filterStatus === 'all' ? 'All Applications' : STATUS_CONFIG[filterStatus].label} action={
          <button onClick={() => setModal('app')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add
          </button>
        }>
          {filtered.length === 0 && (
            <EmptyState icon={Briefcase} message={filterStatus === 'all' ? 'No applications yet' : `No ${STATUS_CONFIG[filterStatus].label.toLowerCase()} applications`} cta={filterStatus === 'all' ? { label: 'Add', onClick: () => setModal('app') } : undefined} />
          )}
          <ul className="space-y-2">
            {filtered.map(app => {
              const cfg = STATUS_CONFIG[app.status]
              const isExpanded = expandedApp === app.id
              const isAnalyzing = analyzingAppId === app.id
              return (
                <li key={app.id} className="border border-surface-3 rounded-lg overflow-hidden group">
                  <div className="flex items-start gap-3 p-3 bg-surface-2 hover:bg-surface-3/40 transition-colors">
                    <button onClick={() => setExpandedApp(isExpanded ? null : app.id)} aria-label={isExpanded ? 'Collapse' : 'Expand'} className="mt-0.5 text-slate-600 hover:text-slate-400 shrink-0">
                      <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200">{app.company}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-sm text-slate-400">{app.role}</span>
                        {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-accent transition-colors"><ExternalLink size={11} /></a>}
                        {isAnalyzing && <span className="text-xs text-slate-600 italic">Analyzing JD...</span>}
                        {!isAnalyzing && app.jd_analysis && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${matchColor(app.jd_analysis.matchPercentage)}`}>{app.jd_analysis.matchPercentage}% match</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <select value={app.status} onChange={e => handleStatus(app.id, e.target.value as AppStatus)}
                          className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer font-medium ${cfg.color} ${cfg.bg}`}>
                          {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                        </select>
                        {app.location && <span className="text-xs text-slate-600">{app.location}</span>}
                        {app.salary_range && <span className="text-xs text-slate-600">{app.salary_range}</span>}
                        <span className="text-xs text-slate-700">{app.applied_at}</span>
                      </div>
                      {app.notes && <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{app.notes}</p>}
                    </div>
                    <button onClick={() => handleDeleteApp(app.id)} aria-label="Delete application" className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all mt-0.5"><Trash2 size={13} /></button>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-surface-3 bg-surface-2/50 pt-3">
                      {isAnalyzing ? (
                        <div className="space-y-2">{[80, 60, 90].map((w, i) => <div key={i} className="h-3 rounded bg-surface-3 animate-pulse" style={{ width: `${w}%` }} />)}</div>
                      ) : app.jd_analysis ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Required Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {app.jd_analysis.requiredSkills.map(s => <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-surface-3 text-slate-300">{s}</span>)}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Missing Skills</p>
                              {app.jd_analysis.missingSkills.length === 0 ? (
                                <p className="text-xs text-slate-600 italic">None identified</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {app.jd_analysis.missingSkills.map(s => <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">{s}</span>)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Priority Prep Topics</p>
                            <div className="flex flex-wrap gap-1">
                              {app.jd_analysis.priorityTopics.map(t => <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">{t}</span>)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Company Focus</p>
                            <p className="text-sm text-slate-400 leading-relaxed">{app.jd_analysis.companyFocus}</p>
                          </div>
                        </div>
                      ) : app.job_description ? (
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-slate-600 italic flex-1">Analysis unavailable — AI budget may have been reached.</p>
                          <button onClick={() => handleAnalyzeJD(app.id, app.job_description!)} className="shrink-0 text-xs px-2 py-1 rounded-lg border border-surface-3 text-slate-400 hover:text-accent hover:border-accent/40 transition-colors">
                            Retry analysis
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500">Added before Job Descriptions were required — paste one now to get skill matching and prep topics.</p>
                          <textarea value={jdInput} onChange={e => setJdInput(e.target.value)} rows={3} placeholder="Paste the job description..."
                            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
                          <button onClick={() => jdInput.trim() && handleAnalyzeJD(app.id, jdInput.trim())} disabled={!jdInput.trim()}
                            className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
                            Analyze
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {/* Revision nudge — rule-based, not AI: Q&A not reviewed (or added) in 14+ days */}
      {needsRevisionQA.length > 0 && (
        <Card title="Needs Revision" action={<RotateCcw size={13} className="text-amber-400" />}>
          <p className="text-xs text-slate-500 mb-3">Not reviewed in the last 14 days — worth a quick revisit before an interview.</p>
          <ul className="space-y-1.5">
            {needsRevisionQA.map(q => (
              <li key={q.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors group">
                <p className="flex-1 text-sm text-slate-300 truncate">{q.question}</p>
                <span className="text-xs text-slate-600 shrink-0">{q.topic}</span>
                <button onClick={() => handleMarkReviewed(q.id)}
                  className="text-xs px-2 py-0.5 rounded-lg border border-surface-3 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors opacity-0 group-hover:opacity-100">
                  ✓ Mark reviewed
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Suggested questions — curated, not AI-generated (see suggested-questions.ts) */}
      {suggestedQuestions.length > 0 && (
        <div className="border border-surface-3 rounded-xl overflow-hidden">
          <button onClick={() => setShowSuggestedQuestions(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 transition-colors">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-slate-300">Suggested Questions</span>
              <span className="text-xs text-slate-600">{suggestedQuestions.length} curated Staff-level prep questions</span>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showSuggestedQuestions ? 'rotate-180' : ''}`} />
          </button>
          {showSuggestedQuestions && (
            <div className="px-4 py-3 bg-surface-1 border-t border-surface-3">
              {Object.entries(
                suggestedQuestions.reduce<Record<string, typeof suggestedQuestions>>((acc, s) => {
                  acc[s.topic] = [...(acc[s.topic] ?? []), s]
                  return acc
                }, {})
              ).map(([topic, items]) => (
                <div key={topic} className="mb-3 last:mb-0">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">{topic}</p>
                  <ul className="space-y-1">
                    {items.map(s => (
                      <li key={s.question} className="flex items-center gap-2 py-1 group">
                        <p className="flex-1 text-sm text-slate-300">{s.question}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${DIFFICULTY_CONFIG[s.difficulty].color}`}>{DIFFICULTY_CONFIG[s.difficulty].label}</span>
                        <button onClick={() => handleAddSuggestedQuestion(s)}
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

      {/* Interview Q&A Bank */}
      <Card title={`Interview Q&A (${localQA.length})`} action={
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('generate')} disabled={genLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-xs font-medium hover:bg-surface-3 disabled:opacity-50 transition-colors">
            <Wand2 size={12} className="text-accent" /> {genLoading ? 'Generating...' : 'AI Generate'}
          </button>
          <button onClick={() => setModal('qa')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
      }>
        {/* Topic filter */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {['all', ...QA_TOPICS].map(t => (
            <FilterPill key={t} label={t === 'all' ? 'All' : t} active={filterTopic === t} onClick={() => setFilterTopic(t)} />
          ))}
        </div>

        {filteredQA.length === 0 ? (
          <EmptyState icon={HelpCircle} message="No questions yet — add manually or use AI Generate" cta={{ label: 'Add', onClick: () => setModal('qa') }} />
        ) : (
          <ul className="space-y-2">
            {filteredQA.map(item => {
              const diff = DIFFICULTY_CONFIG[item.difficulty]
              const isExpanded = expandedQA === item.id
              const isEditingThis = editingAnswer === item.id
              return (
                <li key={item.id} className="border border-surface-3 rounded-lg overflow-hidden group">
                  <div className="flex items-start gap-3 p-3 hover:bg-surface-2 transition-colors">
                    <button onClick={() => setExpandedQA(isExpanded ? null : item.id)} aria-label={isExpanded ? 'Collapse answer' : 'Expand answer'} className="mt-0.5 text-slate-600 hover:text-slate-400 shrink-0">
                      <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300">{item.question}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-600">{item.topic}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${diff.color}`}>{diff.label}</span>
                        {item.answer && <span className="text-xs text-green-500/70">✓ answered</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteQA(item.id)} aria-label="Delete question" className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-surface-3 bg-surface-2/50">
                      {isEditingThis ? (
                        <div className="pt-3 space-y-2">
                          <textarea value={answerInput} onChange={e => setAnswerInput(e.target.value)} rows={4} autoFocus
                            className="w-full bg-surface-2 border border-accent rounded-lg px-3 py-2 text-sm text-slate-200 outline-none resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleAnswerSave(item.id)} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs">Save</button>
                            <button onClick={() => setEditingAnswer(null)} className="px-3 py-1.5 rounded-lg bg-surface-2 text-slate-400 text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3">
                          {item.answer ? (
                            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                          ) : (
                            <p className="text-sm text-slate-600 italic">No answer yet</p>
                          )}
                          <div className="mt-2 flex items-center gap-3">
                            <button onClick={() => { setEditingAnswer(item.id); setAnswerInput(item.answer ?? '') }} className="text-xs text-accent hover:underline flex items-center gap-1">
                              <Pencil size={10} /> {item.answer ? 'Edit answer' : 'Add answer'}
                            </button>
                            <button onClick={() => handleMarkReviewed(item.id)} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                              <Check size={10} /> Mark reviewed
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Career Profile */}
      <Card title="Career Profile" action={
        (codingStreak > 0 || studyStreak > 0)
          ? <span className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              {codingStreak > 0 && <span className="flex items-center gap-1">🔥 {codingStreak}-day coding streak</span>}
              {studyStreak > 0 && <span className="flex items-center gap-1">📚 {studyStreak}-day study streak</span>}
              <span className="text-slate-700">— feeds interview readiness</span>
            </span>
          : undefined
      }>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <ProfileField label="Current Role" value={localProfile?.current_role ?? ''} onSave={v => saveProfile('current_role', v)} placeholder="Senior Frontend Engineer" />
          <ProfileField label="Company" value={localProfile?.current_company ?? ''} onSave={v => saveProfile('current_company', v)} placeholder="Accenture" />
          <ProfileField label="Current Salary (₹/yr)" value={localProfile?.current_salary?.toString() ?? ''} onSave={v => saveProfile('current_salary', v)} type="number" placeholder="1200000" masked />
          <ProfileField label="Target Role" value={localProfile?.target_role ?? ''} onSave={v => saveProfile('target_role', v)} placeholder="Staff Engineer / Tech Lead" />
          <ProfileField label="Years of Experience" value={localProfile?.years_experience?.toString() ?? ''} onSave={v => saveProfile('years_experience', v)} type="number" placeholder="5" />
          <ProfileField label="Bio / Focus" value={localProfile?.bio ?? ''} onSave={v => saveProfile('bio', v)} placeholder="Frontend + Testing specialist" />
        </div>
      </Card>

      <GoalsCard module="career" initialGoals={goals} />

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-1 border border-surface-3 rounded-xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-200">
                {modal === 'app' ? 'Add Application' : modal === 'qa' ? 'Add Question' : 'Generate Interview Questions'}
              </h2>
              <button onClick={() => setModal(null)} aria-label="Close" className="p-1.5 -m-1.5 text-slate-500 hover:text-slate-300"><X size={16} /></button>
            </div>

            {modal === 'qa' && (
              <form className="space-y-3" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
                const fd = new FormData(e.currentTarget)
                const question = fd.get('question') as string
                const answer = fd.get('answer') as string || null
                const topic = fd.get('topic') as string
                const difficulty = fd.get('difficulty') as Difficulty
                const newQA: InterviewQA = { id: `temp-${Date.now()}`, user_id: '', question, answer, topic, difficulty, created_at: new Date().toISOString(), last_reviewed_at: null }
                setLocalQA(prev => [newQA, ...prev])
                setModal(null)
                await addInterviewQA(question, answer, topic, difficulty)
              }}>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Question</label>
                  <textarea name="question" required autoFocus rows={3} placeholder="What is the difference between..." className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none ${invalidFields.has('question') ? 'border-red-500' : 'border-surface-3'}`} />
                  <FieldError show={invalidFields.has('question')} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Answer (optional — add later)</label>
                  <textarea name="answer" rows={3} placeholder="Your answer..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Topic</label>
                    <select name="topic" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                      {QA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Difficulty</label>
                    <select name="difficulty" defaultValue="medium" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => <option key={d} value={d}>{DIFFICULTY_CONFIG[d].label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 active:scale-95 transition">Add</button>
                </div>
              </form>
            )}

            {modal === 'generate' && (
              <form className="space-y-3" onSubmit={async e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                await handleGenerate(fd.get('topic') as string, fd.get('difficulty') as string)
              }}>
                <p className="text-sm text-slate-400">Generate 5 interview questions for <span className="text-accent font-medium">{localProfile?.target_role ?? 'your target role'}</span> using AI.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Topic</label>
                    <select name="topic" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                      {QA_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Difficulty</label>
                    <select name="difficulty" defaultValue="medium" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 active:scale-95 transition flex items-center justify-center gap-1.5">
                    <Wand2 size={12} /> Generate 5 Questions
                  </button>
                </div>
              </form>
            )}

            {modal === 'app' && (
              <form className="space-y-3" noValidate onInput={onFieldInput} onSubmit={async e => {
                e.preventDefault()
                if (!validate(e.currentTarget)) return
                const fd = new FormData(e.currentTarget)
                await handleAddApplication(fd)
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Company *</label>
                    <input name="company" required autoFocus placeholder="Google" className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors ${invalidFields.has('company') ? 'border-red-500' : 'border-surface-3'}`} />
                    <FieldError show={invalidFields.has('company')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Role *</label>
                    <input name="role" required placeholder="Senior Engineer" className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors ${invalidFields.has('role') ? 'border-red-500' : 'border-surface-3'}`} />
                    <FieldError show={invalidFields.has('role')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Status</label>
                    <select name="status" defaultValue="applied" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Applied On</label>
                    <input name="applied_at" type="date" defaultValue={todayIST()} className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Location</label>
                    <input name="location" placeholder="Remote / Bangalore" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Salary Range</label>
                    <input name="salary_range" placeholder="₹40–60 LPA" className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Job URL</label>
                  <input name="url" type="url" placeholder="https://..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Job Description *</label>
                  <textarea name="job_description" required rows={5} placeholder="Paste the full job description — used to auto-analyze required skills, match %, and prep topics" className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none ${invalidFields.has('job_description') ? 'border-red-500' : 'border-surface-3'}`} />
                  <FieldError show={invalidFields.has('job_description')} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wider">Notes</label>
                  <textarea name="notes" rows={2} placeholder="Referral from X, interesting stack..." className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-accent transition-colors resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-2 rounded-lg bg-surface-2 border border-surface-3 text-slate-300 text-sm hover:bg-surface-3 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 active:scale-95 transition">Add Application</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
