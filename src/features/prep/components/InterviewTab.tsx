'use client'

import { useMemo, useState, useTransition } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import Card from '@/components/Card'
import ConfirmDialog from '@/components/ConfirmDialog'
import { modalInputClass, modalLabelClass, modalSaveButtonClass, modalCancelButtonClass } from '@/components/Modal'
import { COMPETENCIES, type PrepSession } from '../types'
import { createInterviewPrep, deleteInterviewPrep, deleteCompanyGuide, ensureCompanyGuide } from '../actions'
import { companyKey, searchLinks, type CompanyGuide, type InterviewPrep } from '../jd'
import { categoryLabel } from './MockHistory'
import { clock } from '../war'
import { guard } from '@/lib/guard'

// Interview tab: pick or search a company → its guide (process, sourced
// questions, tips — researched once by the /interview-prep Claude Code
// skill, shared across every interview you have there) → optionally
// schedule an interview (date/time/round, an optional JD for the
// deterministic bonus match against your own bank/stories — jd.ts, no AI).

const ROUNDS = ['Screening', 'Technical', 'Machine coding', 'System design', 'Hiring manager', 'Behavioral', 'Onsite / final', 'Other']
const WHY_CLS = { weak: 'text-risk', unseen: 'text-accent', review: 'text-fg-tertiary' } as const
const label = 'text-[10.5px] font-semibold uppercase tracking-[0.4px] text-fg-tertiary'
const fromHHMM = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m }
const tomorrow = (today: string) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }
const whenLabel = (p: InterviewPrep) => `${new Date(`${p.interview_date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}${p.start_min !== null ? ` · ${clock(p.start_min)}` : ''}`

interface Company { key: string; name: string; guide: CompanyGuide | null; preps: InterviewPrep[] }

export function InterviewTab({ preps, setPreps, guides, setGuides, today, onOpenTopic, onSession }: {
  preps: InterviewPrep[]
  setPreps: (fn: (prev: InterviewPrep[]) => InterviewPrep[]) => void
  guides: CompanyGuide[]
  setGuides: (fn: (prev: CompanyGuide[]) => CompanyGuide[]) => void
  today: string
  onOpenTopic: (category: string, topic: string) => void
  onSession: (s: PrepSession) => void
}) {
  // Companies merge guides (researched or not) with companies you've only
  // scheduled an interview at — one list either way.
  const companies = useMemo((): Company[] => {
    const byKey = new Map<string, Company>()
    for (const g of guides) byKey.set(g.company_key, { key: g.company_key, name: g.company, guide: g, preps: [] })
    for (const p of preps) {
      const k = companyKey(p.company)
      const c = byKey.get(k) ?? { key: k, name: p.company, guide: null, preps: [] }
      c.preps.push(p)
      byKey.set(k, c)
    }
    for (const c of byKey.values()) c.preps.sort((a, b) => b.interview_date.localeCompare(a.interview_date))
    return [...byKey.values()].sort((a, b) => {
      const an = a.preps[0]?.interview_date ?? '', bn = b.preps[0]?.interview_date ?? ''
      return bn.localeCompare(an) || (b.guide?.updated_at ?? '').localeCompare(a.guide?.updated_at ?? '')
    })
  }, [guides, preps])

  const [selectedKey, setSelectedKey] = useState<string | null>(companies[0]?.key ?? null)
  const selected = companies.find(c => c.key === selectedKey) ?? companies[0] ?? null
  const [newCompany, setNewCompany] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [form, setForm] = useState({ role: '', round: 'Technical', date: tomorrow(today), time: '11:00', minutes: 60, jd: '' })
  const [error, setError] = useState<string | null>(null)
  const [confirmDeletePrep, setConfirmDeletePrep] = useState<InterviewPrep | null>(null)
  const [confirmDeleteGuide, setConfirmDeleteGuide] = useState<Company | null>(null)
  const [busy, startTransition] = useTransition()
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const addCompany = () => {
    const name = newCompany.trim()
    if (!name) return
    const key = companyKey(name)
    setNewCompany('')
    if (!companies.some(c => c.key === key)) {
      setGuides(prev => [{ id: `tmp-${key}`, company: name, company_key: key, research: null, updated_at: new Date().toISOString() }, ...prev])
      startTransition(guard(() => ensureCompanyGuide(name)))
    }
    setSelectedKey(key)
  }
  const submitInterview = () => {
    if (!selected) return
    setError(null)
    startTransition(guard(async () => {
      try {
        const r = await createInterviewPrep({ company: selected.name, role: form.role, round: form.round, jd: form.jd, date: form.date, startMin: form.time ? fromHHMM(form.time) : null, minutes: form.minutes })
        setPreps(prev => [r.prep, ...prev])
        if (r.session) onSession(r.session)
        setForm(f => ({ ...f, jd: '' }))
        setScheduling(false)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not schedule this interview') }
    }))
  }
  const removePrep = (p: InterviewPrep) => {
    setConfirmDeletePrep(null)
    setPreps(prev => prev.filter(x => x.id !== p.id))
    startTransition(guard(() => deleteInterviewPrep(p.id)))
  }
  const removeGuide = (c: Company) => {
    setConfirmDeleteGuide(null)
    if (c.guide) { setGuides(prev => prev.filter(x => x.id !== c.guide!.id)); startTransition(guard(() => deleteCompanyGuide(c.guide!.id))) }
    if (selectedKey === c.key) setSelectedKey(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-[var(--grid-gap)] items-start">
      <div className="space-y-[var(--grid-gap)] min-w-0">
        <Card title="Add a company">
          <div className="flex gap-1.5">
            <input value={newCompany} onChange={e => setNewCompany(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompany()} placeholder="e.g. Razorpay" className={modalInputClass()} />
            <button onClick={addCompany} disabled={!newCompany.trim()} className={`${modalSaveButtonClass} !px-2.5 shrink-0`}><Plus size={14} /></button>
          </div>
          <p className="text-[11px] text-fg-tertiary mt-1.5">Then run <code className="text-[10.5px] bg-surface-2 rounded px-1">/interview-prep {`<company>`}</code> in Claude Code to research it — reported process, most-asked questions and sources, saved here.</p>
        </Card>
        {companies.length > 0 && (
          <Card title={`Companies · ${companies.length}`}>
            <ul className="space-y-1">
              {companies.map(c => {
                const next = c.preps.find(p => p.interview_date >= today) ?? c.preps[0]
                return (
                  <li key={c.key}>
                    <button onClick={() => setSelectedKey(c.key)} className={`w-full text-left rounded-[8px] border border-l-[3px] px-2.5 py-1.5 transition-colors ${c.key === selected?.key ? 'border-surface-3 border-l-accent bg-accent-soft' : `border-surface-3 ${next && next.interview_date >= today ? 'border-l-warn' : 'border-l-border-strong'} hover:bg-surface-2`}`}>
                      <p className="text-[12.5px] font-semibold text-fg-primary truncate">{c.name}</p>
                      <p className="text-[11px] text-fg-tertiary">{c.guide?.research ? 'researched' : 'not researched yet'}{next ? ` · ${whenLabel(next)}` : ''}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>

      {selected ? (
        <CompanyDetail company={selected} today={today} scheduling={scheduling} setScheduling={setScheduling} form={form} set={set} error={error} busy={busy}
          onSubmit={submitInterview} onDeletePrep={p => setConfirmDeletePrep(p)} onDeleteGuide={() => setConfirmDeleteGuide(selected)} onOpenTopic={onOpenTopic} />
      ) : <Card><p className="text-[12.5px] text-fg-tertiary py-6 text-center">Add a company on the left to see its guide and schedule an interview.</p></Card>}

      {confirmDeletePrep && (
        <ConfirmDialog title="Delete this interview?" description={`${confirmDeletePrep.company}${confirmDeletePrep.round ? ` · ${confirmDeletePrep.round}` : ''} on ${whenLabel(confirmDeletePrep)} will be removed.`} onCancel={() => setConfirmDeletePrep(null)} onConfirm={() => removePrep(confirmDeletePrep)} />
      )}
      {confirmDeleteGuide && (
        <ConfirmDialog title="Delete this company's guide?" description={`${confirmDeleteGuide.name}'s researched process and questions will be removed. Scheduled interviews there stay.`} onCancel={() => setConfirmDeleteGuide(null)} onConfirm={() => removeGuide(confirmDeleteGuide)} />
      )}
    </div>
  )
}

function CompanyDetail({ company, today, scheduling, setScheduling, form, set, error, busy, onSubmit, onDeletePrep, onDeleteGuide, onOpenTopic }: {
  company: Company; today: string; scheduling: boolean; setScheduling: (v: boolean) => void
  form: { role: string; round: string; date: string; time: string; minutes: number; jd: string }
  set: <K extends 'role' | 'round' | 'date' | 'time' | 'minutes' | 'jd'>(k: K, v: { role: string; round: string; date: string; time: string; minutes: number; jd: string }[K]) => void
  error: string | null; busy: boolean; onSubmit: () => void
  onDeletePrep: (p: InterviewPrep) => void; onDeleteGuide: () => void
  onOpenTopic: (category: string, topic: string) => void
}) {
  const research = company.guide?.research ?? null
  const links = searchLinks(company.name, company.preps[0]?.role ?? null, today)
  const competency = (k: string) => COMPETENCIES.find(c => c.key === k)?.label ?? k
  const matchedPrep = company.preps.find(p => p.matched) ?? null

  return (
    <div className="space-y-[var(--grid-gap)] min-w-0">
      <Card title={company.name} action={company.guide && <button onClick={onDeleteGuide} aria-label="Delete company guide" className="text-fg-quaternary hover:text-risk p-0.5"><Trash2 size={13} /></button>}>
        {research?.summary && <p className="text-[13px] text-fg-primary leading-relaxed">{research.summary}</p>}
      </Card>

      <Card title="Company guide" action={research ? <span className="text-[11px] text-fg-tertiary">researched {research.updatedAt.slice(0, 10)}</span> : undefined}>
        {research ? <>
          {research.process && research.process.length > 0 && <>
            <p className={`${label} mb-1`}>Reported process</p>
            <ol className="list-decimal pl-4 text-[12px] text-fg-secondary space-y-0.5 mb-2">{research.process.map((x, i) => <li key={i}>{x}</li>)}</ol>
          </>}
          {research.questions.length > 0 && <>
            <p className={`${label} mb-1`}>Reported questions · {research.questions.length}</p>
            <ul className="space-y-1 mb-2">{research.questions.map((q, i) => <li key={i} className="text-[12.5px] text-fg-primary leading-snug">{q.q}{q.count && q.count > 1 ? <span className="text-[11px] text-accent"> · ×{q.count}</span> : null}{q.source && <span className="text-[11px] text-fg-tertiary"> · {q.source}</span>}</li>)}</ul>
          </>}
          {research.sources.length > 0 && <>
            <p className={`${label} mb-1`}>Sources</p>
            <ul className="space-y-0.5">{research.sources.map((s, i) => (
              <li key={i} className="text-[12px] truncate"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{s.title}</a>{s.date && <span className="text-fg-tertiary"> · {s.date}</span>}</li>
            ))}</ul>
          </>}
        </> : (
          <p className="text-[12px] text-fg-secondary mb-2">Not researched yet — run <code className="text-[11.5px] bg-surface-2 rounded px-1">/interview-prep {company.name}</code> in Claude Code to pull the reported process and most-asked questions with sources.</p>
        )}
        <p className={`${label} mt-2 mb-1`}>Search the last 12 months</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"><ExternalLink size={11} /> {l.label}</a>)}
        </div>
      </Card>

      <Card title={`Interviews at ${company.name} · ${company.preps.length}`} action={<button onClick={() => setScheduling(!scheduling)} className="text-[11.5px] text-accent hover:underline inline-flex items-center gap-1"><Plus size={12} /> Schedule</button>}>
        {scheduling && (
          <div className="space-y-2 mb-3 pb-3 border-b border-border">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={modalLabelClass}>Role</label><input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Senior Frontend" className={modalInputClass()} /></div>
              <div><label className={modalLabelClass}>Round</label><select value={form.round} onChange={e => set('round', e.target.value)} className={modalInputClass()}>{ROUNDS.map(r => <option key={r}>{r}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_64px] gap-2">
              <div><label className={modalLabelClass}>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={modalInputClass()} /></div>
              <div><label className={modalLabelClass}>Time (IST)</label><input type="time" step={900} value={form.time} onChange={e => set('time', e.target.value)} className={modalInputClass()} /></div>
              <div><label className={modalLabelClass}>Min</label><input type="number" min={15} max={240} step={15} value={form.minutes} onChange={e => set('minutes', Number(e.target.value))} className={modalInputClass()} /></div>
            </div>
            <div><label className={modalLabelClass}>Job description (optional — matches your bank/stories to it)</label>
              <textarea value={form.jd} onChange={e => set('jd', e.target.value)} rows={5} placeholder="Paste it for a bonus match against your own practice" className={modalInputClass()} />
            </div>
            {error && <p className="text-[12px] text-risk">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setScheduling(false)} className={`${modalCancelButtonClass} flex-1`}>Cancel</button>
              <button onClick={onSubmit} disabled={busy} className={`${modalSaveButtonClass} flex-1`}>{busy ? 'Scheduling…' : 'Schedule it'}</button>
            </div>
          </div>
        )}
        {company.preps.length > 0 ? (
          <ul className="space-y-1">
            {company.preps.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-[12.5px] px-1 py-1">
                <span className="text-fg-primary">{whenLabel(p)}{p.round ? ` · ${p.round}` : ''}{p.role ? ` · ${p.role}` : ''}{p.matched ? <span className="text-[10.5px] text-accent"> · matched</span> : null}</span>
                <button onClick={() => onDeletePrep(p)} aria-label="Delete" className="text-fg-quaternary hover:text-risk p-0.5 shrink-0"><Trash2 size={12} /></button>
              </li>
            ))}
          </ul>
        ) : !scheduling && <p className="text-[12px] text-fg-tertiary">No interview scheduled here yet.</p>}
      </Card>

      {matchedPrep?.matched && (
        <Card title={`Practise from your bank · ${matchedPrep.matched.questions.length}`}>
          {matchedPrep.matched.questions.length > 0 ? (
            <ul className="space-y-1">
              {matchedPrep.matched.questions.map(q => (
                <li key={q.id}>
                  <button onClick={() => onOpenTopic(q.category, q.topic ?? '')} className="w-full text-left flex items-baseline gap-2 text-[12.5px] hover:text-accent group">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.3px] shrink-0 w-[46px] ${WHY_CLS[q.why]}`}>{q.why}</span>
                    <span className="text-fg-primary group-hover:text-accent min-w-0 flex-1 truncate">{q.title}</span>
                    <span className="text-[10.5px] text-fg-tertiary shrink-0">{categoryLabel(q.category)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12px] text-fg-tertiary">No bank questions matched this JD&apos;s skills.</p>}
          {matchedPrep.matched.gaps.length > 0 && <>
            <p className={`${label} mt-3 mb-1`}>Your coverage of these areas</p>
            <ul className="space-y-0.5">
              {matchedPrep.matched.gaps.map(g => {
                const pct = g.total ? Math.round(g.seen / g.total * 100) : 0
                return (
                  <li key={g.category} className="grid grid-cols-[1fr_auto_auto] gap-3 text-[12px] tabular-nums">
                    <span className="text-fg-secondary truncate">{categoryLabel(g.category)}</span>
                    <span className={pct < 30 ? 'text-risk' : pct < 60 ? 'text-warn' : 'text-good'}>{pct}% practised</span>
                    <span className="text-fg-tertiary w-[52px] text-right">{g.avgRating !== null ? `${g.avgRating}/10` : '—'}</span>
                  </li>
                )
              })}
            </ul>
          </>}
          {matchedPrep.matched.stories.length > 0 && <>
            <p className={`${label} mt-3 mb-1`}>Stories to have ready</p>
            <ul className="space-y-0.5">{matchedPrep.matched.stories.map(s => <li key={s.id} className="text-[12px]"><span className="text-fg-primary">{s.title}</span> <span className="text-fg-tertiary">· {s.competencies.map(competency).join(', ')}</span></li>)}</ul>
          </>}
        </Card>
      )}
    </div>
  )
}
