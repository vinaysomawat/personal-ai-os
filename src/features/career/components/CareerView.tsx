'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Check, ExternalLink, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import Card from '@/components/Card'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import Modal, { modalLabelClass, modalInputClass, modalSelectClass, modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import PageTabs from '@/components/PageTabs'
import PageHeader, { HeaderChip } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { useAIAdvisor } from '@/components/AIAdvisorProvider'
import { useEscapeKey } from '@/lib/use-escape-key'
import {
  addCompany, addQuestion, addRound, deleteApplication, deleteQuestion, deleteRound,
  saveApplicationJD, updateCompany, updateQuestion, updateRound, upsertCareerProfile,
} from '../actions'
import { askCareerMentor, analyzeJobDescription, getCompanyInsights } from '@/features/ai/career-mentor'
import { READINESS_AREAS } from '@/features/prep/types'
import {
  ACTIVE_STATUSES, QUESTION_CATEGORIES, ROUND_KINDS, STAGES, STAGE_CONFIG, categoryLabel, roundLabel,
  type Application, type AppStatus, type CareerProfile, type CompanyInsights, type InterviewQuestion, type InterviewRound, type QuestionCategory, type RoundKind, type Skill,
} from '../types'

const WENT: Record<string, { label: string; cls: string }> = {
  well: { label: 'Went well', cls: 'text-good bg-good-soft' },
  ok: { label: 'OK', cls: 'text-warn bg-warn-soft' },
  badly: { label: 'Went badly', cls: 'text-risk bg-risk-soft' },
}
const OUTCOME_CLS: Record<string, string> = { passed: 'text-good', failed: 'text-risk', pending: 'text-fg-tertiary' }

const when = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  : 'not scheduled'
// <input type="datetime-local"> ↔ ISO, in the browser's local time.
const toLocalInput = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const fromLocalInput = (v: string) => v ? new Date(v).toISOString() : null

// JD priority topic (QUIZ_TOPICS vocabulary) → a Prep Question Bank link.
function prepHref(topic: string): string {
  if (topic === 'System Design') return '/prep?tab=questions&cat=system-design'
  const area = READINESS_AREAS.find(a => (a.quizTopics as readonly string[]).includes(topic))
  const coding = area?.codingTopics[0]
  return `/prep?tab=questions&cat=quiz${coding ? `&topic=${encodeURIComponent(coding)}` : ''}`
}

function ProfileField({ label, value, onSave, type = 'text', placeholder, masked = false }: {
  label: string; value: string; onSave: (v: string) => void; type?: string; placeholder?: string; masked?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value)
  const [revealed, setRevealed] = useState(false)
  if (!editing) return (
    <div className="group">
      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-[5px]">{label}</p>
      <button onClick={() => { if (masked && !revealed) { setRevealed(true); return } setInput(value); setEditing(true) }} className="text-left w-full">
        <p className={`text-[13.5px] font-medium flex items-center gap-1 ${value ? 'text-fg-primary' : 'text-fg-tertiary'}`}>
          {masked && !revealed && value ? '•••••• (tap to reveal)' : value || `Set ${label.toLowerCase()}`}
          <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
        </p>
      </button>
    </div>
  )
  return (
    <div>
      <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px] mb-[5px]">{label}</p>
      <div className="flex items-center gap-1">
        <input value={input} onChange={e => setInput(e.target.value)} type={type} placeholder={placeholder} autoFocus
          onKeyDown={e => { if (e.key === 'Enter') { onSave(input); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 bg-surface-2 border border-accent rounded px-2 py-1 text-[13.5px] text-fg-primary outline-none" />
        <button onClick={() => { onSave(input); setEditing(false) }} aria-label="Save" className="p-1.5 -m-1.5 text-good shrink-0"><Check size={12} /></button>
        <button onClick={() => setEditing(false)} aria-label="Cancel edit" className="p-1.5 -m-1.5 text-fg-tertiary shrink-0"><X size={12} /></button>
      </div>
    </div>
  )
}

interface Props {
  applications: Application[]
  profile: CareerProfile | null
  skills: Skill[]
  rounds: InterviewRound[]
  questions: InterviewQuestion[]
  codingStreak: number
}

type Tab = 'companies' | 'questions' | 'profile'
const TABS: { key: Tab; label: string }[] = [
  { key: 'companies', label: 'Companies' },
  { key: 'questions', label: 'Question Log' },
  { key: 'profile', label: 'Profile' },
]

const EMPTY_Q = { question: '', category: 'technical' as QuestionCategory, round_id: '', my_answer: '', went: '' as '' | 'well' | 'ok' | 'badly', notes: '' }

export default function CareerView(props: Props) {
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('companies')
  const [apps, setApps] = useState(props.applications)
  const [rounds, setRounds] = useState(props.rounds)
  const [questions, setQuestions] = useState(props.questions)
  const [profile, setProfile] = useState(props.profile)
  const active = (a: Application) => ACTIVE_STATUSES.includes(a.status) || a.status === 'offer'
  const [selectedId, setSelectedId] = useState<string | null>(() => props.applications.find(active)?.id ?? props.applications[0]?.id ?? null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Application | null>(null)
  useEscapeKey(() => setAddOpen(false))

  const nowIso = new Date().toISOString()
  const upcoming = rounds.filter(r => r.status === 'scheduled' && r.scheduled_at && r.scheduled_at >= nowIso).sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))
  const next = upcoming[0] ?? null
  const companyOf = (id: string) => apps.find(a => a.id === id)
  const in7d = upcoming.filter(r => r.scheduled_at! <= new Date(Date.now() + 7 * 86400000).toISOString()).length
  const sorted = useMemo(() => {
    const nextFor = (id: string) => upcoming.find(r => r.application_id === id)?.scheduled_at ?? '9999'
    return [...apps].sort((a, b) => Number(active(b)) - Number(active(a)) || nextFor(a.id).localeCompare(nextFor(b.id)) || b.created_at.localeCompare(a.created_at))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, rounds])
  const selected = apps.find(a => a.id === selectedId) ?? null

  const saveProfile = (field: keyof CareerProfile, raw: string) => {
    const value = ['current_salary', 'years_experience'].includes(field) ? (parseFloat(raw) || null) : raw
    setProfile(p => ({ id: '', user_id: '', current_role: null, current_company: null, current_salary: null, target_role: null, years_experience: null, bio: null, updated_at: '', ...p, [field]: value }))
    startTransition(() => upsertCareerProfile({ [field]: value }))
  }

  // ---- Career Mentor (header advisor) ----
  const [mentorQ, setMentorQ] = useState('')
  const [mentorA, setMentorA] = useState<string | null>(null)
  const [mentorLoading, setMentorLoading] = useState(false)
  const ask = async () => {
    if (!mentorQ.trim() || mentorLoading) return
    setMentorLoading(true); setMentorA(null)
    try { setMentorA(await askCareerMentor(mentorQ, { profile, skills: props.skills, applications: apps, rounds, questions, codingStreak: props.codingStreak })) }
    finally { setMentorLoading(false) }
  }
  const advisorPortal = useAIAdvisor('Career Mentor', Sparkles, (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {['How do I answer the questions that went badly?', 'What should I prep for my next round?', 'How do I negotiate an offer?'].map(q => (
          <button key={q} onClick={() => setMentorQ(q)} className="text-xs text-fg-quaternary px-2 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 hover:text-fg-secondary">{q}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={mentorQ} onChange={e => setMentorQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} disabled={mentorLoading}
          placeholder="Ask about your interviews, offers, salary…" className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent" />
        <button onClick={ask} disabled={mentorLoading || !mentorQ.trim()} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50">{mentorLoading ? '…' : 'Ask'}</button>
      </div>
      {mentorLoading && <div className="space-y-2">{[90, 75, 85].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
      {mentorA && <p className="text-sm text-fg-secondary whitespace-pre-wrap leading-relaxed">{mentorA}</p>}
    </div>
  ))

  const activeCount = apps.filter(a => ACTIVE_STATUSES.includes(a.status)).length
  const badly = questions.filter(q => q.went === 'badly').length

  return (
    <div className="space-y-3">
      {advisorPortal}
      <PageHeader title="Interviews" chips={<>
        <HeaderChip tone="accent">🎯 {activeCount} active</HeaderChip>
        {next && <HeaderChip>📅 Next: {companyOf(next.application_id)?.company} · {roundLabel(next.kind)} · {when(next.scheduled_at)}</HeaderChip>}
      </>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--grid-gap-sm)]">
        <StatCard label="Active processes" value={activeCount} sub={`${apps.length} companies screened`} />
        <StatCard label="Upcoming rounds" value={in7d} sub={next ? `next ${formatDistanceToNow(new Date(next.scheduled_at!), { addSuffix: true })}` : 'none scheduled'} />
        <StatCard label="Questions logged" value={questions.length} sub={`${badly} went badly`} valueClassName={badly ? undefined : undefined} />
        <StatCard label="Offers" value={apps.filter(a => a.status === 'offer').length} sub={`${apps.filter(a => a.status === 'rejected').length} rejected · ${rounds.filter(r => r.outcome === 'passed').length} rounds passed`} />
      </div>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[var(--grid-gap)] items-start">
          <Card title="Companies" action={<button onClick={() => setAddOpen(true)} className="px-3 py-[6px] rounded-[7px] bg-accent text-white text-[12px] font-semibold inline-flex items-center gap-1"><Plus size={12} /> Add</button>}>
            {apps.length === 0 ? (
              <EmptyState icon={Sparkles} message="Add a company once a phone screen is booked — then prep for it here and log every question they ask." compact cta={{ label: 'Add company', onClick: () => setAddOpen(true) }} />
            ) : (
              <ul className="flex flex-col gap-1">
                {sorted.map(a => {
                  const nextRound = upcoming.find(r => r.application_id === a.id)
                  const qn = questions.filter(q => q.application_id === a.id).length
                  return (
                    <li key={a.id}>
                      <button onClick={() => setSelectedId(a.id)} aria-pressed={selectedId === a.id}
                        className={`w-full text-left rounded-[9px] px-2.5 py-2 transition-colors ${selectedId === a.id ? 'bg-accent-soft' : 'hover:bg-surface-2'} ${active(a) ? '' : 'opacity-60'}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-semibold text-fg-primary truncate">{a.company}</span>
                          <span className={`text-[11px] font-semibold shrink-0 ${STAGE_CONFIG[a.status].color}`}>{STAGE_CONFIG[a.status].label}</span>
                        </div>
                        <p className="text-[11.5px] text-fg-tertiary truncate">{a.role}</p>
                        <p className="text-[11px] text-fg-tertiary tabular-nums">{nextRound ? `📅 ${roundLabel(nextRound.kind)} · ${when(nextRound.scheduled_at)}` : 'no round scheduled'}{qn ? ` · ${qn} Qs` : ''}</p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          {selected ? (
            <CompanyDetail key={selected.id} app={selected} profile={profile}
              rounds={rounds.filter(r => r.application_id === selected.id)}
              questions={questions.filter(q => q.application_id === selected.id)}
              onApp={a => setApps(prev => prev.map(x => x.id === a.id ? a : x))}
              onRounds={fn => setRounds(fn)} onQuestions={fn => setQuestions(fn)}
              onDelete={() => setConfirmDelete(selected)} />
          ) : (
            <Card><p className="text-[12.5px] text-fg-tertiary">Pick a company.</p></Card>
          )}
        </div>
      )}

      {tab === 'questions' && <QuestionLog questions={questions} apps={apps} rounds={rounds} onQuestions={fn => setQuestions(fn)} />}

      {tab === 'profile' && (
        <Card title="Career Profile" action={props.codingStreak > 0 ? <span className="text-[11px] text-fg-tertiary">🔥 {props.codingStreak}-day coding streak</span> : undefined}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ProfileField label="Current Role" value={profile?.current_role ?? ''} onSave={v => saveProfile('current_role', v)} placeholder="Senior Frontend Engineer" />
            <ProfileField label="Company" value={profile?.current_company ?? ''} onSave={v => saveProfile('current_company', v)} />
            <ProfileField label="Current Salary (₹/yr)" value={profile?.current_salary?.toString() ?? ''} onSave={v => saveProfile('current_salary', v)} type="number" masked />
            <ProfileField label="Target Role" value={profile?.target_role ?? ''} onSave={v => saveProfile('target_role', v)} placeholder="Senior Frontend / Tech Lead" />
            <ProfileField label="Years of Experience" value={profile?.years_experience?.toString() ?? ''} onSave={v => saveProfile('years_experience', v)} type="number" />
            <ProfileField label="Bio / Focus" value={profile?.bio ?? ''} onSave={v => saveProfile('bio', v)} />
          </div>
          <p className="text-[11px] text-fg-tertiary mt-3">Used by the JD analysis and the Career Mentor.</p>
        </Card>
      )}

      {addOpen && <AddCompanyModal onClose={() => setAddOpen(false)} onAdded={a => { setApps(prev => [a, ...prev]); setSelectedId(a.id); setTab('companies') }} />}
      {confirmDelete && (
        <ConfirmDialog title={`Delete ${confirmDelete.company}?`} description="Its rounds and every logged question are deleted too." onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            const id = confirmDelete.id
            setConfirmDelete(null)
            setApps(prev => prev.filter(a => a.id !== id)); setRounds(prev => prev.filter(r => r.application_id !== id)); setQuestions(prev => prev.filter(q => q.application_id !== id))
            setSelectedId(null)
            startTransition(() => deleteApplication(id))
          }} />
      )}
    </div>
  )
}

// ---------------- Add company ----------------

function AddCompanyModal({ onClose, onAdded }: { onClose: () => void; onAdded: (a: Application) => void }) {
  const [busy, start] = useTransition()
  const [f, setF] = useState({ company: '', role: '', status: 'screening' as AppStatus, url: '', job_description: '', notes: '' })
  return (
    <Modal title="Add company" onClose={onClose}>
      <form className="flex flex-col gap-2.5" onSubmit={e => {
        e.preventDefault()
        if (!f.company.trim() || !f.role.trim()) return
        start(async () => { onAdded(await addCompany({ ...f, url: f.url || null, job_description: f.job_description || null, notes: f.notes || null })); onClose() })
      }}>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={modalLabelClass}>Company</label><input autoFocus required value={f.company} onChange={e => setF({ ...f, company: e.target.value })} className={modalInputClass()} /></div>
          <div><label className={modalLabelClass}>Role</label><input required value={f.role} onChange={e => setF({ ...f, role: e.target.value })} placeholder="Senior Frontend Engineer" className={modalInputClass()} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={modalLabelClass}>Stage</label>
            <select value={f.status} onChange={e => setF({ ...f, status: e.target.value as AppStatus })} className={modalSelectClass}>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </select></div>
          <div><label className={modalLabelClass}>Job link (optional)</label><input value={f.url} onChange={e => setF({ ...f, url: e.target.value })} className={modalInputClass()} /></div>
        </div>
        <div><label className={modalLabelClass}>Job description (optional — enables the JD analysis)</label><textarea rows={4} value={f.job_description} onChange={e => setF({ ...f, job_description: e.target.value })} className={modalInputClass()} /></div>
        <div><label className={modalLabelClass}>Notes (optional)</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Recruiter name, referral, comp range…" className={modalInputClass()} /></div>
        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} className={modalCancelButtonClass}>Cancel</button>
          <button type="submit" disabled={busy} className={modalSaveButtonClass}>{busy ? 'Adding…' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ---------------- Company detail ----------------

function CompanyDetail({ app, profile, rounds, questions, onApp, onRounds, onQuestions, onDelete }: {
  app: Application; profile: CareerProfile | null; rounds: InterviewRound[]; questions: InterviewQuestion[]
  onApp: (a: Application) => void
  onRounds: (fn: (prev: InterviewRound[]) => InterviewRound[]) => void
  onQuestions: (fn: (prev: InterviewQuestion[]) => InterviewQuestion[]) => void
  onDelete: () => void
}) {
  const [, start] = useTransition()
  const [round, setRound] = useState({ kind: 'technical' as RoundKind, at: '', interviewer: '' })
  const [q, setQ] = useState(EMPTY_Q)
  const [insights, setInsights] = useState<CompanyInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [jd, setJd] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [openRound, setOpenRound] = useState<string | null>(null)

  const setApp = (patch: Partial<Application>) => { onApp({ ...app, ...patch }); start(() => updateCompany(app.id, patch)) }
  const patchRound = (r: InterviewRound, patch: Partial<InterviewRound>) => { onRounds(prev => prev.map(x => x.id === r.id ? { ...x, ...patch } : x)); start(() => updateRound(r.id, patch)) }
  const loadInsights = async () => { setInsightsLoading(true); try { setInsights(await getCompanyInsights(app.company, app.role)) } finally { setInsightsLoading(false) } }
  const analyze = async (text: string) => {
    setAnalyzing(true)
    try {
      const analysis = await analyzeJobDescription(text, app.company, app.role, profile)
      onApp({ ...app, job_description: text, jd_analysis: analysis })
      await saveApplicationJD(app.id, text, analysis)
    } finally { setAnalyzing(false) }
  }
  const sortedRounds = [...rounds].sort((a, b) => (a.scheduled_at ?? a.created_at).localeCompare(b.scheduled_at ?? b.created_at))

  return (
    <div className="space-y-[var(--grid-gap)]">
      <Card title={`${app.company} · ${app.role}`} action={
        <div className="flex items-center gap-2">
          <select value={app.status} onChange={e => setApp({ status: e.target.value as AppStatus })} aria-label="Stage"
            className={`bg-surface-2 border border-surface-3 rounded-[7px] px-2 py-1 text-[12px] font-semibold outline-none ${STAGE_CONFIG[app.status].color}`}>
            {[...new Set([app.status, ...STAGES])].map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
          </select>
          {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" aria-label="Job link" className="text-fg-tertiary hover:text-accent"><ExternalLink size={14} /></a>}
          <button onClick={onDelete} aria-label="Delete company" className="text-fg-quaternary hover:text-risk"><Trash2 size={14} /></button>
        </div>
      }>
        {app.notes && <p className="text-[12px] text-fg-secondary mb-2">{app.notes}</p>}
        <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mb-1.5">Rounds</p>
        {sortedRounds.length === 0 && <p className="text-[12px] text-fg-tertiary mb-2">No rounds yet — add the next one when it&apos;s booked.</p>}
        <ul className="flex flex-col gap-1.5 mb-2.5">
          {sortedRounds.map(r => (
            <li key={r.id} className="rounded-[9px] bg-surface-2 px-2.5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => setOpenRound(openRound === r.id ? null : r.id)} className="text-left min-w-0">
                  <span className="text-[12.5px] font-semibold text-fg-primary">{roundLabel(r.kind)}</span>
                  <span className="text-[11.5px] text-fg-tertiary"> · {when(r.scheduled_at)}{r.interviewer ? ` · ${r.interviewer}` : ''}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <select value={r.status} onChange={e => patchRound(r, { status: e.target.value as InterviewRound['status'] })} aria-label="Round status" className="bg-surface-1 border border-surface-3 rounded-[6px] px-1.5 py-[3px] text-[11.5px] text-fg-secondary">
                    <option value="scheduled">Scheduled</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
                  </select>
                  <select value={r.outcome} onChange={e => patchRound(r, { outcome: e.target.value as InterviewRound['outcome'] })} aria-label="Round outcome" className={`bg-surface-1 border border-surface-3 rounded-[6px] px-1.5 py-[3px] text-[11.5px] font-semibold ${OUTCOME_CLS[r.outcome]}`}>
                    <option value="pending">Pending</option><option value="passed">Passed</option><option value="failed">Failed</option>
                  </select>
                </div>
              </div>
              {openRound === r.id && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <input type="datetime-local" defaultValue={toLocalInput(r.scheduled_at)} onBlur={e => patchRound(r, { scheduled_at: fromLocalInput(e.target.value) })} className={modalInputClass()} />
                  <textarea rows={2} defaultValue={r.notes ?? ''} onBlur={e => patchRound(r, { notes: e.target.value || null })} placeholder="How it went, who you met, what they focused on…" className={modalInputClass()} />
                  <button onClick={() => { onRounds(prev => prev.filter(x => x.id !== r.id)); start(() => deleteRound(r.id)) }} className="self-start text-[11px] text-fg-quaternary hover:text-risk">Delete round</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <form className="flex flex-wrap gap-1.5" onSubmit={e => {
          e.preventDefault()
          start(async () => {
            const created = await addRound({ application_id: app.id, kind: round.kind, scheduled_at: fromLocalInput(round.at), interviewer: round.interviewer || null })
            onRounds(prev => [...prev, created])
            if (app.status === 'screening' && round.kind !== 'recruiter' && round.kind !== 'phone_screen') onApp({ ...app, status: 'interview' })
            setRound({ kind: round.kind, at: '', interviewer: '' })
          })
        }}>
          <select value={round.kind} onChange={e => setRound({ ...round, kind: e.target.value as RoundKind })} aria-label="Round type" className={`${modalSelectClass} !w-auto`}>
            {ROUND_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
          <input type="datetime-local" value={round.at} onChange={e => setRound({ ...round, at: e.target.value })} aria-label="When" className={`${modalInputClass()} !w-auto`} />
          <input value={round.interviewer} onChange={e => setRound({ ...round, interviewer: e.target.value })} placeholder="Interviewer (optional)" className={`${modalInputClass()} !w-auto flex-1 min-w-[140px]`} />
          <button type="submit" className={modalSaveButtonClass}>+ Round</button>
        </form>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <Card title="Prep for this company">
          {app.jd_analysis ? (
            <div className="text-[12px]">
              <p className="text-fg-secondary"><span className="font-semibold text-fg-primary">JD match {app.jd_analysis.matchPercentage}%</span> · {app.jd_analysis.companyFocus}</p>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary mt-2 mb-1">Practice these first</p>
              <div className="flex flex-wrap gap-1.5">
                {app.jd_analysis.priorityTopics.map(t => <a key={t} href={prepHref(t)} className="text-[11.5px] rounded-full px-2 py-[2px] bg-accent-soft text-accent hover:underline">{t} →</a>)}
              </div>
              {app.jd_analysis.missingSkills.length > 0 && <p className="text-fg-secondary mt-2"><span className="font-semibold text-risk">Gaps: </span>{app.jd_analysis.missingSkills.join(', ')}</p>}
            </div>
          ) : (
            <div>
              <textarea rows={3} value={jd} onChange={e => setJd(e.target.value)} placeholder={app.job_description ? 'Re-run the analysis on the saved JD, or paste a new one' : 'Paste the job description to get priority topics and gaps'} className={modalInputClass()} />
              <button disabled={analyzing || !(jd.trim() || app.job_description)} onClick={() => analyze(jd.trim() || app.job_description!)} className={`${modalSaveButtonClass} mt-1.5 inline-flex items-center gap-1.5 !py-[7px]`}>
                <Sparkles size={13} /> {analyzing ? 'Analyzing…' : 'Analyze JD'}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-surface-3 text-[12px]">
            <a href="/prep?tab=mock&format=screen" className="text-accent hover:underline">Mock frontend screen →</a>
            <a href="/prep?tab=mock&format=system-design" className="text-accent hover:underline">Mock system design →</a>
            <a href="/prep?tab=stories" className="text-accent hover:underline">Rehearse STAR stories →</a>
          </div>
        </Card>

        <Card title="Interview guidance" action={!insights && <button onClick={loadInsights} disabled={insightsLoading} className="text-[11.5px] text-accent hover:underline inline-flex items-center gap-1 disabled:opacity-50"><Sparkles size={12} /> {insightsLoading ? 'Loading…' : 'Load'}</button>}>
          {insightsLoading && <div className="space-y-2">{[90, 70, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}</div>}
          {!insights && !insightsLoading && <p className="text-[12px] text-fg-tertiary">What {app.company} is known to ask and how their loop runs (AI, cached 7 days; says when it&apos;s only general guidance).</p>}
          {insights && (
            <div className="text-[12.5px] text-fg-secondary space-y-1.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-fg-tertiary">{insights.source === 'company-specific' ? `${app.company}-specific` : 'General guidance (no reliable company data)'} · {formatDistanceToNow(new Date(insights.generatedAt), { addSuffix: true })}</p>
              <p>{insights.interviewTrends}</p>
              <p>{insights.hiringPatterns}</p>
            </div>
          )}
        </Card>
      </div>

      <Card title="Questions they asked" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{questions.length} logged</span>}>
        <form className="flex flex-col gap-1.5 mb-2.5" onSubmit={e => {
          e.preventDefault()
          if (!q.question.trim()) return
          start(async () => {
            const created = await addQuestion({ application_id: app.id, round_id: q.round_id || null, question: q.question, category: q.category, my_answer: q.my_answer || null, went: q.went || null, notes: q.notes || null })
            onQuestions(prev => [created, ...prev])
            setQ({ ...EMPTY_Q, category: q.category, round_id: q.round_id })
          })
        }}>
          <textarea rows={2} value={q.question} onChange={e => setQ({ ...q, question: e.target.value })} placeholder="What did they ask? (exact wording if you can)" className={modalInputClass()} />
          <textarea rows={2} value={q.my_answer} onChange={e => setQ({ ...q, my_answer: e.target.value })} placeholder="What you answered (optional — so you can tighten it later)" className={modalInputClass()} />
          <div className="flex flex-wrap gap-1.5">
            <select value={q.category} onChange={e => setQ({ ...q, category: e.target.value as QuestionCategory })} aria-label="Category" className={`${modalSelectClass} !w-auto`}>
              {QUESTION_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={q.round_id} onChange={e => setQ({ ...q, round_id: e.target.value })} aria-label="Round" className={`${modalSelectClass} !w-auto`}>
              <option value="">Any round</option>
              {sortedRounds.map(r => <option key={r.id} value={r.id}>{roundLabel(r.kind)}{r.scheduled_at ? ` · ${when(r.scheduled_at)}` : ''}</option>)}
            </select>
            <select value={q.went} onChange={e => setQ({ ...q, went: e.target.value as typeof q.went })} aria-label="How it went" className={`${modalSelectClass} !w-auto`}>
              <option value="">How did it go?</option><option value="well">Went well</option><option value="ok">OK</option><option value="badly">Went badly</option>
            </select>
            <button type="submit" disabled={!q.question.trim()} className={`${modalSaveButtonClass} ml-auto`}>Save question</button>
          </div>
        </form>
        <QuestionList questions={questions} rounds={rounds} onQuestions={onQuestions} />
      </Card>
    </div>
  )
}

// ---------------- Questions ----------------

function QuestionList({ questions, rounds, apps, onQuestions }: {
  questions: InterviewQuestion[]; rounds: InterviewRound[]; apps?: Application[]
  onQuestions: (fn: (prev: InterviewQuestion[]) => InterviewQuestion[]) => void
}) {
  const [, start] = useTransition()
  const [open, setOpen] = useState<string | null>(null)
  const patch = (q: InterviewQuestion, p: Partial<InterviewQuestion>) => { onQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...p } : x)); start(() => updateQuestion(q.id, p)) }
  if (questions.length === 0) return <p className="text-[12px] text-fg-tertiary">Nothing logged yet.</p>
  return (
    <ul className="flex flex-col gap-1.5">
      {questions.map(q => {
        const r = rounds.find(x => x.id === q.round_id)
        const company = apps?.find(a => a.id === q.application_id)?.company
        return (
          <li key={q.id} className="rounded-[9px] bg-surface-2 px-2.5 py-2">
            <button onClick={() => setOpen(open === q.id ? null : q.id)} className="w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-fg-primary leading-snug">{q.question}</p>
                {q.went && <span className={`text-[10.5px] font-semibold rounded-[5px] px-1.5 py-[1px] shrink-0 ${WENT[q.went].cls}`}>{WENT[q.went].label}</span>}
              </div>
              <p className="text-[11px] text-fg-tertiary mt-0.5">{company ? `${company} · ` : ''}{categoryLabel(q.category)}{r ? ` · ${roundLabel(r.kind)}` : ''} · {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            </button>
            {open === q.id && (
              <div className="mt-2 flex flex-col gap-1.5">
                <textarea rows={3} defaultValue={q.my_answer ?? ''} onBlur={e => patch(q, { my_answer: e.target.value || null })} placeholder="Your answer — refine it into the one you'll give next time" className={modalInputClass()} />
                <textarea rows={2} defaultValue={q.notes ?? ''} onBlur={e => patch(q, { notes: e.target.value || null })} placeholder="Notes: follow-ups they asked, what they seemed to want…" className={modalInputClass()} />
                <div className="flex items-center gap-2">
                  <select value={q.went ?? ''} onChange={e => patch(q, { went: (e.target.value || null) as InterviewQuestion['went'] })} aria-label="How it went" className={`${modalSelectClass} !w-auto`}>
                    <option value="">How did it go?</option><option value="well">Went well</option><option value="ok">OK</option><option value="badly">Went badly</option>
                  </select>
                  <button onClick={() => { onQuestions(prev => prev.filter(x => x.id !== q.id)); start(() => deleteQuestion(q.id)) }} className="ml-auto text-[11px] text-fg-quaternary hover:text-risk">Delete</button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function QuestionLog({ questions, apps, rounds, onQuestions }: {
  questions: InterviewQuestion[]; apps: Application[]; rounds: InterviewRound[]
  onQuestions: (fn: (prev: InterviewQuestion[]) => InterviewQuestion[]) => void
}) {
  const [cat, setCat] = useState<QuestionCategory | 'all'>('all')
  const [went, setWent] = useState<'all' | 'badly'>('all')
  const [search, setSearch] = useState('')
  const shown = questions.filter(q => (cat === 'all' || q.category === cat) && (went === 'all' || q.went === 'badly') && (!search || `${q.question} ${q.my_answer ?? ''}`.toLowerCase().includes(search.toLowerCase())))
  const counts = QUESTION_CATEGORIES.map(c => ({ ...c, n: questions.filter(q => q.category === c.key).length }))
  return (
    <Card title="Question Log" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{shown.length}/{questions.length}</span>}>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[{ key: 'all' as const, label: 'All', n: questions.length }, ...counts].map(c => (
          <button key={c.key} onClick={() => setCat(c.key)} aria-pressed={cat === c.key}
            className={`text-[11.5px] px-2.5 py-1 rounded-full border ${cat === c.key ? 'bg-accent-soft border-accent text-accent' : 'border-border-strong text-fg-secondary hover:bg-surface-2'}`}>{c.label} · {c.n}</button>
        ))}
        <button onClick={() => setWent(went === 'badly' ? 'all' : 'badly')} aria-pressed={went === 'badly'}
          className={`text-[11.5px] px-2.5 py-1 rounded-full border ${went === 'badly' ? 'bg-risk-soft border-risk text-risk' : 'border-border-strong text-fg-secondary hover:bg-surface-2'}`}>Went badly · {questions.filter(q => q.went === 'badly').length}</button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions and answers" className={`${modalInputClass()} mb-2.5`} />
      {questions.length === 0
        ? <p className="text-[12px] text-fg-tertiary">Every question an interviewer asks you — logged from a company&apos;s page or by telling the Career bot — collects here.</p>
        : <QuestionList questions={shown} rounds={rounds} apps={apps} onQuestions={onQuestions} />}
    </Card>
  )
}
