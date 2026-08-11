'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, ExternalLink, X, Sparkles, ChevronRight, Pencil, Check, Bell } from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { useAIAdvisor } from '@/components/AIAdvisorProvider'
import { todayIST } from '@/lib/date'
import {
  addApplication, updateStatus, deleteApplication, saveApplicationJD,
  upsertCareerProfile, saveQuizAttempt,
} from '../actions'
import { askCareerMentor, analyzeJobDescription, getCompanyInsights } from '@/features/ai/career-mentor'
import { generateTopicQuiz } from '@/features/ai/quiz'
import { gradeQuiz, computeReadiness, suggestNextTopic } from '../quiz-calculations'
import type { Application, AppStatus, CareerProfile, Skill, QuizAttempt, QuizQuestion, Difficulty, CompanyInsights, JobAlert } from '../types'
import { DIFFICULTY_CONFIG, QUIZ_TOPICS, READINESS_CONFIG } from '../types'
import { useEscapeKey } from '@/lib/use-escape-key'
import { useFormValidation } from '@/lib/use-form-validation'
import FieldError from '@/components/FieldError'

const STATUS_CONFIG: Record<AppStatus, { label: string; color: string; bg: string }> = {
  applied:   { label: 'Applied',   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  screening: { label: 'Screening', color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  interview: { label: 'Interview', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  offer:     { label: 'Offer',     color: 'text-green-400',  bg: 'bg-good-soft' },
  rejected:  { label: 'Rejected',  color: 'text-red-400',    bg: 'bg-red-400/10' },
}
const STATUSES = Object.keys(STATUS_CONFIG) as AppStatus[]
// Design's quick-filter pills — 5 items, deliberately excluding Rejected
// (still reachable via the per-application status select and "All").
const FILTER_STATUSES: (AppStatus | 'all')[] = ['all', 'applied', 'screening', 'interview', 'offer']

// Design keeps the match badge's background neutral (surface-2) and only
// recolors the text — not a filled bg+text pill like elsewhere in the app.
function matchTextColor(pct: number): string {
  if (pct >= 70) return 'text-green-400'
  if (pct >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ProfileField({ label, value, onSave, type = 'text', placeholder, masked = false }: {
  label: string; value: string; onSave: (v: string) => void; type?: string; placeholder?: string; masked?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value)
  const [revealed, setRevealed] = useState(false)

  if (masked && !editing && !revealed) return (
    <div>
      <div className="flex items-center justify-between mb-[5px]">
        <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">{label}</p>
        <button onClick={() => setRevealed(true)} aria-label="Reveal value" className="p-1.5 -m-1.5 text-[12px] leading-none">
          🙈
        </button>
      </div>
      <p className="text-[13.5px] font-medium text-fg-primary tracking-widest">••••••</p>
    </div>
  )

  if (!editing) return (
    <div className="text-left w-full group">
      <div className="flex items-center justify-between mb-[5px]">
        <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">{label}</p>
        {masked && (
          <button onClick={() => setRevealed(false)} aria-label="Hide value" className="p-1.5 -m-1.5 text-[12px] leading-none">
            👁
          </button>
        )}
      </div>
      <button onClick={() => { setInput(value); setEditing(true) }} className="text-left w-full">
        <p className={`text-[13.5px] font-medium flex items-center gap-1 ${value ? 'text-fg-primary' : 'text-fg-quaternary'}`}>
          {value || `Set ${label.toLowerCase()}`}
          <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
        </p>
      </button>
    </div>
  )
  return (
    <div>
      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-[5px]">{label}</p>
      <div className="flex items-center gap-1">
        <input value={input} onChange={e => setInput(e.target.value)} type={type} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { onSave(input); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          autoFocus className="flex-1 bg-surface-2 border border-accent rounded px-2 py-1 text-[13.5px] text-fg-primary outline-none" />
        <button onClick={() => { onSave(input); setEditing(false) }} aria-label="Save" className="p-1.5 -m-1.5 text-green-400 shrink-0"><Check size={12} /></button>
        <button onClick={() => setEditing(false)} aria-label="Cancel edit" className="p-1.5 -m-1.5 text-fg-quaternary shrink-0"><X size={12} /></button>
      </div>
    </div>
  )
}

interface QuizSession {
  topic: string
  difficulty: Difficulty
  stage: 'picking' | 'generating' | 'taking' | 'results'
  questions: QuizQuestion[]
  answers: number[]
  score: number
  weakAreas: string[]
}

interface Props {
  applications: Application[]
  profile: CareerProfile | null
  skills: Skill[]
  quizAttempts: QuizAttempt[]
  recommendedTopic: { topic: string; reason: string } | null
  codingStreak: number
  studyStreak: number
  jobAlerts: JobAlert[]
}

export default function CareerView({ applications, profile, skills, quizAttempts, recommendedTopic, codingStreak, studyStreak, jobAlerts }: Props) {
  const [, startTransition] = useTransition()

  const [localApps, setLocalApps] = useState(applications)
  const [localProfile, setLocalProfile] = useState(profile)
  const [localQuizAttempts, setLocalQuizAttempts] = useState(quizAttempts)

  const [filterStatus, setFilterStatus] = useState<AppStatus | 'all'>('all')
  const [appsSort, setAppsSort] = useState<'recent' | 'match' | 'company'>('recent')
  const [modal, setModal] = useState<'app' | null>(null)
  useEscapeKey(() => setModal(null))
  const { invalidFields, validate, clear, onFieldInput } = useFormValidation()

  // Set when "Track" is clicked on a Job Alert row — pre-fills the Add
  // Application modal's company/role/url so surfacing a lead and starting to
  // track it takes one click instead of retyping what's already known.
  const [prefillApp, setPrefillApp] = useState<{ company: string; role: string; url: string } | null>(null)
  useEffect(() => { clear(); if (!modal) setPrefillApp(null) }, [modal, clear])

  // JD analysis
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [analyzingAppId, setAnalyzingAppId] = useState<string | null>(null)
  const [jdInput, setJdInput] = useState('')

  // Company Insights — keyed by company name, shared across every application to that company
  const [companyInsights, setCompanyInsights] = useState<Record<string, CompanyInsights | null>>({})
  const [loadingInsightsFor, setLoadingInsightsFor] = useState<string | null>(null)

  // Quiz
  const [quiz, setQuiz] = useState<QuizSession | null>(null)
  useEscapeKey(() => setQuiz(null))

  // AI Mentor
  const [mentorQ, setMentorQ] = useState('')
  const [mentorA, setMentorA] = useState<string | null>(null)
  const [mentorLoading, setMentorLoading] = useState(false)

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: localApps.filter(a => a.status === s).length }), {} as Record<AppStatus, number>)
  const filteredByStatus = filterStatus === 'all' ? localApps : localApps.filter(a => a.status === filterStatus)
  const filtered = appsSort === 'match'
    ? [...filteredByStatus].sort((a, b) => (b.jd_analysis?.matchPercentage ?? -1) - (a.jd_analysis?.matchPercentage ?? -1))
    : appsSort === 'company'
    ? [...filteredByStatus].sort((a, b) => a.company.localeCompare(b.company))
    : filteredByStatus

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

  const handleTrackJobAlert = (alert: JobAlert) => {
    setPrefillApp({ company: alert.company, role: alert.title, url: alert.url })
    setModal('app')
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

  const handleLoadCompanyInsights = async (company: string, role: string) => {
    if (company in companyInsights || loadingInsightsFor === company) return
    setLoadingInsightsFor(company)
    const insights = await getCompanyInsights(company, role)
    setCompanyInsights(prev => ({ ...prev, [company]: insights }))
    setLoadingInsightsFor(null)
  }

  const handleAsk = async () => {
    if (!mentorQ.trim() || mentorLoading) return
    setMentorLoading(true); setMentorA(null)
    try {
      const answer = await askCareerMentor(mentorQ, { profile: localProfile, skills, applications: localApps, quizAttempts: localQuizAttempts, codingStreak, studyStreak })
      setMentorA(answer)
    } finally { setMentorLoading(false) }
  }

  const handleOpenQuiz = (topic: string) => setQuiz({ topic, difficulty: 'medium', stage: 'picking', questions: [], answers: [], score: 0, weakAreas: [] })
  const handleCloseQuiz = () => setQuiz(null)

  const handleGenerateQuiz = async (difficulty?: Difficulty) => {
    if (!quiz) return
    const targetDifficulty = difficulty ?? quiz.difficulty
    setQuiz(q => q ? { ...q, difficulty: targetDifficulty, stage: 'generating' } : q)
    const priorWeakAreas = localQuizAttempts.filter(a => a.topic === quiz.topic).flatMap(a => a.weak_areas)
    // Real pipeline signal, not just past quiz misses: a JD's own missingSkills
    // for any active application that flagged this topic as a priority.
    const jdMissingSkills = localApps
      .filter(a => a.status !== 'rejected' && a.jd_analysis?.priorityTopics.includes(quiz.topic))
      .flatMap(a => a.jd_analysis!.missingSkills)
    const weakAreas = [...new Set([...priorWeakAreas, ...jdMissingSkills])]
    const questions = await generateTopicQuiz(quiz.topic, targetDifficulty, weakAreas)
    if (questions.length === 0) { setQuiz(null); return }
    setQuiz(q => q ? { ...q, stage: 'taking', questions, answers: new Array(questions.length).fill(-1) } : q)
  }

  const handleRetakeQuiz = () => {
    if (!quiz) return
    setQuiz(q => q ? { ...q, stage: 'picking', questions: [], answers: [], score: 0, weakAreas: [] } : q)
  }

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    setQuiz(q => {
      if (!q) return q
      const answers = [...q.answers]
      answers[qIndex] = optIndex
      return { ...q, answers }
    })
  }

  const handleSubmitQuiz = async () => {
    if (!quiz) return
    const { score, weakAreas } = gradeQuiz(quiz.questions, quiz.answers)
    setQuiz(q => q ? { ...q, stage: 'results', score, weakAreas } : q)
    const newAttempt: QuizAttempt = {
      id: `temp-${Date.now()}`, user_id: '', topic: quiz.topic, difficulty: quiz.difficulty,
      questions: quiz.questions, user_answers: quiz.answers, score, total: quiz.questions.length,
      weak_areas: weakAreas, created_at: new Date().toISOString(),
    }
    setLocalQuizAttempts(prev => [newAttempt, ...prev])
    await saveQuizAttempt(quiz.topic, quiz.difficulty, quiz.questions, quiz.answers, score, weakAreas)
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
          <button key={q} onClick={() => setMentorQ(q)} className="text-xs text-fg-quaternary px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-fg-secondary transition-colors">{q}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={mentorQ} onChange={e => setMentorQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="Am I ready for a promotion? What should I learn next?" disabled={mentorLoading}
          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
        <button onClick={handleAsk} disabled={mentorLoading || !mentorQ.trim()} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
          {mentorLoading ? '...' : 'Ask'}
        </button>
      </div>
      {mentorLoading && <div className="space-y-2">{[85, 70, 90, 60].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
      {mentorA && <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-3">{mentorA}</p>}
    </div>
  ))

  return (
    <div className="space-y-3">
      {advisorPortal}
      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Career</h1>
        <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">💼 {localApps.length} active applications</span>
        {counts.interview > 0 && (
          <span className="text-[11px] font-semibold bg-accent-soft rounded-full px-2.5 py-1 text-accent-strong">🎯 {counts.interview} at interview</span>
        )}
      </div>

      {/* Applications Pipeline */}
      <Card title="Applications" padding="p-3.5" action={
        <div className="flex items-center gap-2">
          <select value={appsSort} onChange={e => setAppsSort(e.target.value as typeof appsSort)}
            className="bg-surface-2 border border-surface-3 rounded-[7px] px-2 py-[6px] text-[11.5px] text-fg-secondary outline-none cursor-pointer">
            <option value="recent">Sort: Recent</option>
            <option value="match">Sort: Match %</option>
            <option value="company">Sort: Company A–Z</option>
          </select>
          <button onClick={() => setModal('app')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors whitespace-nowrap">
            <Plus size={12} /> Add Application
          </button>
        </div>
      }>
        <div className="flex flex-wrap gap-2 mb-3.5">
          {FILTER_STATUSES.map(s => {
            const label = s === 'all' ? 'All' : STATUS_CONFIG[s].label
            const count = s === 'all' ? localApps.length : counts[s]
            const active = filterStatus === s
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3.5 py-[6px] text-xs border transition-colors ${active ? 'bg-accent border-accent text-white' : 'bg-surface-2 border-surface-3 text-fg-secondary hover:bg-surface-3'}`}>
                {label} ({count})
              </button>
            )
          })}
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-7">
            <div className="text-[22px] mb-1.5">📭</div>
            <p className="text-[13px] text-fg-tertiary">No applications in this status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
            {filtered.map(app => {
              const cfg = STATUS_CONFIG[app.status]
              const isExpanded = expandedApp === app.id
              const isAnalyzing = analyzingAppId === app.id
              return (
                <div key={app.id} onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-4 cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm flex items-center gap-1.5 text-fg-primary">
                        <ChevronRight size={10} className={`shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <span className="truncate">{app.company}</span>
                        {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 text-fg-quaternary hover:text-accent transition-colors"><ExternalLink size={11} /></a>}
                      </div>
                      <div className="text-xs text-fg-tertiary ml-[14px] truncate">{app.role} · {app.applied_at}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isAnalyzing ? (
                        <span className="text-[10px] text-fg-quaternary italic whitespace-nowrap">Analyzing...</span>
                      ) : app.jd_analysis ? (
                        <span className={`text-[11px] font-bold px-2 py-[3px] rounded-[6px] bg-surface-2 ${matchTextColor(app.jd_analysis.matchPercentage)}`}>{app.jd_analysis.matchPercentage}%</span>
                      ) : null}
                      <button onClick={e => { e.stopPropagation(); handleDeleteApp(app.id) }} aria-label="Delete application" className="text-fg-quaternary hover:text-red-400 transition-colors p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="ml-[14px] mt-2" onClick={e => e.stopPropagation()}>
                    <select value={app.status} onChange={e => handleStatus(app.id, e.target.value as AppStatus)}
                      className={`text-[11.5px] font-semibold bg-transparent border border-border-strong rounded-[6px] px-1.5 py-[3px] outline-none cursor-pointer ${cfg.color}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                  {(app.location || app.salary_range) && (
                    <div className="ml-[14px] mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-fg-quaternary">
                      {app.location && <span>{app.location}</span>}
                      {app.salary_range && <span>{app.salary_range}</span>}
                    </div>
                  )}
                  {app.notes && <p className="ml-[14px] mt-1 text-[11px] text-fg-tertiary line-clamp-1">{app.notes}</p>}
                  {isExpanded && (
                    <div className="ml-[14px] mt-3 pt-3 border-t border-surface-3 flex flex-col gap-2.5" onClick={e => e.stopPropagation()}>
                      {isAnalyzing ? (
                        <div className="space-y-2">{[80, 60, 90].map((w, i) => <div key={i} className="h-3 rounded bg-surface-3 animate-pulse" style={{ width: `${w}%` }} />)}</div>
                      ) : app.jd_analysis ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Required Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {app.jd_analysis.requiredSkills.map(s => <span key={s} className="text-[10.5px] px-2 py-[3px] rounded-[5px] bg-surface-2 text-fg-secondary">{s}</span>)}
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Missing Skills</p>
                              {app.jd_analysis.missingSkills.length === 0 ? (
                                <p className="text-xs text-fg-quaternary italic">None identified</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {app.jd_analysis.missingSkills.map(s => <span key={s} className="text-[10.5px] px-2 py-[3px] rounded-[5px] bg-risk-soft text-risk">{s}</span>)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Priority Prep Topics</p>
                            <div className="flex flex-wrap gap-1">
                              {app.jd_analysis.priorityTopics.map(t => <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">{t}</span>)}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Company Focus</p>
                            <p className="text-sm text-fg-secondary leading-relaxed">{app.jd_analysis.companyFocus}</p>
                          </div>
                        </>
                      ) : app.job_description ? (
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-fg-quaternary italic flex-1">Analysis unavailable — AI budget may have been reached.</p>
                          <button onClick={() => handleAnalyzeJD(app.id, app.job_description!)} className="shrink-0 text-xs px-2 py-1 rounded-lg border border-surface-3 text-fg-secondary hover:text-accent hover:border-accent/40 transition-colors">
                            Retry analysis
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-fg-tertiary">Added before Job Descriptions were required — paste one now to get skill matching and prep topics.</p>
                          <textarea value={jdInput} onChange={e => setJdInput(e.target.value)} rows={3} placeholder="Paste the job description..."
                            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors resize-none" />
                          <button onClick={() => jdInput.trim() && handleAnalyzeJD(app.id, jdInput.trim())} disabled={!jdInput.trim()}
                            className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
                            Analyze
                          </button>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-surface-3">
                        <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-1.5">Interview Guidance</p>
                        {loadingInsightsFor === app.company ? (
                          <div className="space-y-2">{[85, 65].map((w, i) => <div key={i} className="h-3 rounded bg-surface-3 animate-pulse" style={{ width: `${w}%` }} />)}</div>
                        ) : app.company in companyInsights ? (
                          companyInsights[app.company] ? (
                            <div className="space-y-2">
                              <span className="inline-block text-[9.5px] font-bold uppercase text-fg-tertiary bg-surface-3 rounded px-1.5 py-0.5">
                                {companyInsights[app.company]!.source === 'company-specific' ? 'Company-specific' : 'General guidance'}
                              </span>
                              <p className="text-sm text-fg-secondary leading-relaxed">{companyInsights[app.company]!.interviewTrends}</p>
                              <p className="text-sm text-fg-secondary leading-relaxed">{companyInsights[app.company]!.hiringPatterns}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-fg-quaternary italic">Unavailable — AI budget may have been reached.</p>
                          )
                        ) : (
                          <button onClick={() => handleLoadCompanyInsights(app.company, app.role)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-surface-3 text-fg-secondary hover:text-accent hover:border-accent/40 transition-colors">
                            Load Interview Guidance
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Job Alerts — deterministic daily poll of public Greenhouse/Lever
          boards (src/features/career/job-alerts.ts), already Telegram-
          notified; this surfaces the same job_alerts_seen log in-app. */}
      <Card title="Job Alerts" padding="p-3.5" action={
        jobAlerts.length > 0 ? <span className="text-xs text-fg-tertiary">{jobAlerts.length} in the last 30 days</span> : undefined
      }>
        {jobAlerts.length === 0 ? (
          <EmptyState icon={Bell} message="No new postings yet — checked daily against 16 companies' public job boards" compact />
        ) : (
          <div className="flex flex-col gap-1">
            {jobAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-2.5 py-[9px] border-b border-surface-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-fg-primary">{alert.company}</span>
                  <span className="text-[13px] text-fg-secondary"> · {alert.title}</span>
                </div>
                <span className="text-[11px] text-fg-tertiary whitespace-nowrap">{shortDate(alert.created_at)}</span>
                <a href={alert.url} target="_blank" rel="noopener noreferrer" aria-label="View posting" className="text-[12px] text-fg-tertiary hover:text-accent transition-colors no-underline">↗</a>
                <button onClick={() => handleTrackJobAlert(alert)} className="shrink-0 text-[11.5px] px-2.5 py-1 rounded-[6px] border border-border-strong text-fg-secondary hover:text-accent hover:border-accent/40 transition-colors whitespace-nowrap">
                  Track
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Interview Prep — Interactive Topic Quiz */}
      <Card title="Interview Prep — Topic Quiz" padding="p-3.5">
        {recommendedTopic && (
          <div className="flex items-center gap-3 p-3 mb-4 rounded-[10px] bg-accent-soft border border-accent-border">
            <span className="shrink-0">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] text-fg-secondary">Recommended: <span className="font-bold text-fg-primary">{recommendedTopic.topic}</span> — {recommendedTopic.reason}</p>
            </div>
            <button onClick={() => handleOpenQuiz(recommendedTopic.topic)} className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/80 transition-colors">
              Start Quiz
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {QUIZ_TOPICS.map(topic => {
            const { tier, avgPercent } = computeReadiness(localQuizAttempts, topic)
            const lastAttempt = localQuizAttempts.filter(a => a.topic === topic).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
            const rcfg = READINESS_CONFIG[tier]
            return (
              <button key={topic} onClick={() => handleOpenQuiz(topic)}
                className="relative flex flex-col items-start p-3 rounded-[10px] border border-surface-3 bg-surface-2 hover:bg-surface-3 transition-colors text-left">
                <span className="absolute top-2.5 right-2.5 w-[7px] h-[7px] rounded-full" style={{ background: rcfg.color }} />
                <span className="text-[12.5px] font-semibold text-fg-primary pr-3">{topic}</span>
                <span className="text-[10.5px] font-bold mt-1.5 px-2.5 py-[3px] rounded-full inline-block" style={{ color: rcfg.color, background: rcfg.bg }}>{rcfg.label}{avgPercent !== null ? ` · ${avgPercent}%` : ''}</span>
                <span className="text-[10.5px] text-fg-tertiary mt-[3px]">{lastAttempt ? `Last score: ${Math.round((lastAttempt.score / lastAttempt.total) * 100)}%` : 'No attempts yet'}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Career Profile */}
      <Card title="Career Profile" padding="p-3.5" action={
        (codingStreak > 0 || studyStreak > 0)
          ? <div className="flex items-center gap-2 flex-wrap">
              {codingStreak > 0 && <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">🔥 {codingStreak}-day coding streak</span>}
              {studyStreak > 0 && <span className="text-[11px] font-semibold bg-surface-2 rounded-full px-2.5 py-1 text-fg-secondary">📚 {studyStreak}-day study streak</span>}
            </div>
          : undefined
      }>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <ProfileField label="Current Role" value={localProfile?.current_role ?? ''} onSave={v => saveProfile('current_role', v)} placeholder="Senior Frontend Engineer" />
          <ProfileField label="Company" value={localProfile?.current_company ?? ''} onSave={v => saveProfile('current_company', v)} placeholder="Accenture" />
          <ProfileField label="Current Salary (₹/yr)" value={localProfile?.current_salary?.toString() ?? ''} onSave={v => saveProfile('current_salary', v)} type="number" placeholder="1200000" masked />
          <ProfileField label="Target Role" value={localProfile?.target_role ?? ''} onSave={v => saveProfile('target_role', v)} placeholder="Staff Engineer / Tech Lead" />
          <ProfileField label="Years of Experience" value={localProfile?.years_experience?.toString() ?? ''} onSave={v => saveProfile('years_experience', v)} type="number" placeholder="5" />
        </div>
        <div className="mt-4 pt-3.5 border-t border-surface-3">
          <ProfileField label="Bio / Focus" value={localProfile?.bio ?? ''} onSave={v => saveProfile('bio', v)} placeholder="Frontend + Testing specialist" />
        </div>
      </Card>

      {/* Quiz modal */}
      {quiz && (
        <Modal title={`${quiz.topic} Quiz`} onClose={handleCloseQuiz} maxWidthClass="max-w-[520px]">
            {quiz.stage === 'picking' && (() => {
              const seededSubtopics = [...new Set(localQuizAttempts.filter(a => a.topic === quiz.topic).flatMap(a => a.weak_areas))]
              return (
                <div>
                  <p className="text-[13px] text-fg-secondary mb-2.5">Pick a difficulty to generate 10 questions{seededSubtopics.length > 0 ? ', seeded toward your weak subtopics.' : '.'}</p>
                  {seededSubtopics.length > 0 && (
                    <p className="text-[11.5px] text-accent-strong bg-accent-soft rounded-[8px] px-[11px] py-2 mb-3.5">Seeded toward: {seededSubtopics.join(', ')}</p>
                  )}
                  <div className="flex gap-2.5">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                      <button key={d} onClick={() => handleGenerateQuiz(d)}
                        className="flex-1 bg-surface-2 border border-surface-3 rounded-[10px] p-3.5 text-center hover:border-accent/40 transition-colors">
                        <span className="text-[14px] font-bold text-fg-primary">{DIFFICULTY_CONFIG[d].label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {quiz.stage === 'generating' && (
              <div className="space-y-2 py-4">{[90, 70, 85, 60, 75].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>
            )}

            {quiz.stage === 'taking' && (() => {
              const answeredCount = quiz.answers.filter(a => a !== -1).length
              const total = quiz.questions.length
              const submitDisabled = quiz.answers.includes(-1)
              return (
                <div>
                  <p className="text-xs text-fg-tertiary mb-1.5">{DIFFICULTY_CONFIG[quiz.difficulty].label} · {answeredCount} of {total} answered</p>
                  <div className="h-1 rounded-[3px] bg-border mb-3.5">
                    <div className="h-full rounded-[3px] bg-accent transition-all" style={{ width: `${Math.round((answeredCount / total) * 100)}%` }} />
                  </div>
                  <div className="flex flex-col gap-4">
                    {quiz.questions.map((q, qi) => (
                      <div key={qi}>
                        <p className="text-[13.5px] font-semibold text-fg-primary mb-2">{qi + 1}. {q.question}</p>
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((opt, oi) => (
                            <button key={oi} onClick={() => handleSelectAnswer(qi, oi)}
                              className={`text-left w-full rounded-[8px] px-3 py-[9px] text-[12.5px] border transition-colors ${quiz.answers[qi] === oi ? 'bg-accent-soft border-accent text-fg-primary' : 'bg-surface-2 border-surface-3 text-fg-primary hover:border-border-strong'}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2.5 mt-5">
                    <button type="button" onClick={handleCloseQuiz} className={modalCancelButtonClass}>Cancel</button>
                    <button onClick={handleSubmitQuiz} disabled={submitDisabled} className={modalSaveButtonClass}>Submit Quiz</button>
                  </div>
                </div>
              )
            })()}

            {quiz.stage === 'results' && (() => {
              const nextTopic = suggestNextTopic(localQuizAttempts, QUIZ_TOPICS)
              const wrongQuestions = quiz.questions.filter((q, qi) => quiz.answers[qi] !== q.correctIndex)
              const scoreColor = quiz.score >= 80 ? 'var(--good)' : quiz.score >= 60 ? 'var(--accent)' : quiz.score >= 40 ? 'var(--warn)' : 'var(--risk)'
              const readinessNote = quiz.score >= 80 ? 'Readiness → Strong' : quiz.score >= 60 ? 'Readiness → Ready' : quiz.score >= 40 ? 'Readiness → Developing' : 'Readiness → Needs Work'
              const weakAreasText = wrongQuestions.length ? quiz.weakAreas.join(', ') : 'None — clean sweep'
              return (
                <div>
                  <div className="text-center mb-[18px]">
                    <p className="text-[34px] font-bold" style={{ color: scoreColor }}>{quiz.score}%</p>
                    <p className="text-[12.5px] text-fg-tertiary mt-0.5">{quiz.questions.length - wrongQuestions.length} of {quiz.questions.length} correct · {DIFFICULTY_CONFIG[quiz.difficulty].label}</p>
                    <p className="text-[11.5px] font-semibold mt-1.5" style={{ color: scoreColor }}>{readinessNote}</p>
                  </div>
                  {wrongQuestions.length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-2">Review</p>
                      <div className="flex flex-col gap-2.5 mb-4">
                        {quiz.questions.map((q, qi) => quiz.answers[qi] !== q.correctIndex && (
                          <div key={qi} className="bg-risk-soft border border-risk-border rounded-[10px] px-3 py-2.5">
                            <p className="text-[12.5px] font-semibold text-fg-primary mb-1">{q.question}</p>
                            <p className="text-xs text-fg-secondary">{q.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="bg-surface-2 rounded-[10px] px-3.5 py-3 mb-4">
                    <p className="text-xs text-fg-secondary">Weak areas: <span className="text-fg-primary font-semibold">{weakAreasText}</span></p>
                    <p className="text-xs text-fg-secondary mt-1">Next up: <span className="text-accent font-semibold">{nextTopic}</span></p>
                  </div>
                  <div className="flex justify-end gap-2.5">
                    <button onClick={handleRetakeQuiz} className={modalCancelButtonClass}>Retake</button>
                    <button onClick={handleCloseQuiz} className={modalSaveButtonClass}>Done</button>
                  </div>
                </div>
              )
            })()}
        </Modal>
      )}

      {/* Add Application modal */}
      {modal === 'app' && (
        <Modal title="Add Application" onClose={() => setModal(null)} maxWidthClass="max-w-[460px]">
            <form className="flex flex-col gap-3.5" noValidate onInput={onFieldInput} onSubmit={async e => {
              e.preventDefault()
              if (!validate(e.currentTarget)) return
              const fd = new FormData(e.currentTarget)
              await handleAddApplication(fd)
            }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabelClass}>Company</label>
                  <input name="company" required autoFocus defaultValue={prefillApp?.company ?? ''} placeholder="Google" className={modalInputClass(invalidFields.has('company'))} />
                  <FieldError show={invalidFields.has('company')} />
                </div>
                <div>
                  <label className={modalLabelClass}>Role</label>
                  <input name="role" required defaultValue={prefillApp?.role ?? ''} placeholder="Senior Engineer" className={modalInputClass(invalidFields.has('role'))} />
                  <FieldError show={invalidFields.has('role')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabelClass}>Status</label>
                  <select name="status" defaultValue="applied" className={modalSelectClass}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={modalLabelClass}>Salary Range</label>
                  <input name="salary_range" placeholder="₹40–60 LPA" className={modalInputClass()} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabelClass}>Location</label>
                  <input name="location" placeholder="Remote / Bangalore" className={modalInputClass()} />
                </div>
                <div>
                  <label className={modalLabelClass}>Job URL</label>
                  <input name="url" type="url" defaultValue={prefillApp?.url ?? ''} placeholder="https://..." className={modalInputClass()} />
                </div>
              </div>
              <div>
                <label className={modalLabelClass}>Applied On</label>
                <input name="applied_at" type="date" defaultValue={todayIST()} className={modalInputClass()} />
              </div>
              <div>
                <label className={modalLabelClass}>Job Description <span className="text-risk">*</span></label>
                <textarea name="job_description" required rows={4} placeholder="Paste the full job description — used to auto-analyze required skills, match %, and prep topics" className={`${modalInputClass(invalidFields.has('job_description'))} resize-none`} />
                <FieldError show={invalidFields.has('job_description')} message="Job description is required for match analysis." />
              </div>
              <div>
                <label className={modalLabelClass}>Notes</label>
                <textarea name="notes" rows={2} placeholder="Referral from X, interesting stack..." className={`${modalInputClass()} resize-none`} />
              </div>
              <div className="flex justify-end gap-2.5 mt-1.5">
                <button type="button" onClick={() => setModal(null)} className={modalCancelButtonClass}>Cancel</button>
                <button type="submit" className={modalSaveButtonClass}>Add Application</button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  )
}
