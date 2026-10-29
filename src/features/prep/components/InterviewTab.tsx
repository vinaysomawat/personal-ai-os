'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import Card from '@/components/Card'
import ConfirmDialog from '@/components/ConfirmDialog'
import { modalInputClass, modalLabelClass, modalSaveButtonClass } from '@/components/Modal'
import { COMPETENCIES, type PrepSession } from '../types'
import { createInterviewPrep, deleteInterviewPrep, retryInterviewPlan } from '../actions'
import { searchLinks, type InterviewPrep } from '../jd'
import { categoryLabel } from './MockHistory'
import { clock } from '../war'
import { guard } from '@/lib/guard'

// Interview tab: paste a JD for an upcoming interview → the match against
// your Question Bank and Story Bank (jd.ts, no AI), one AI prep plan
// (interview_plan), search links for interview experiences, and online
// research saved by the /interview-prep Claude Code skill.

const ROUNDS = ['Screening', 'Technical', 'Machine coding', 'System design', 'Hiring manager', 'Behavioral', 'Onsite / final', 'Other']
const WHY_CLS = { weak: 'text-risk', unseen: 'text-accent', review: 'text-fg-tertiary' } as const
const label = 'text-[10.5px] font-semibold uppercase tracking-[0.4px] text-fg-tertiary'
const chip = 'text-[10.5px] font-medium rounded-[4px] px-1.5 py-[1px] bg-surface-2 text-fg-secondary'
const fromHHMM = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m }
const tomorrow = (today: string) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) }
const whenLabel = (p: InterviewPrep) => `${new Date(`${p.interview_date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}${p.start_min !== null ? ` · ${clock(p.start_min)}` : ''}`

export function InterviewTab({ preps, setPreps, today, onOpenTopic, onSession }: {
  preps: InterviewPrep[]
  setPreps: (fn: (prev: InterviewPrep[]) => InterviewPrep[]) => void
  today: string
  onOpenTopic: (category: string, topic: string) => void
  onSession: (s: PrepSession) => void
}) {
  const [form, setForm] = useState({ company: '', role: '', round: 'Technical', date: tomorrow(today), time: '11:00', minutes: 60, jd: '' })
  const [selectedId, setSelectedId] = useState<string | null>(preps[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<InterviewPrep | null>(null)
  const [busy, startTransition] = useTransition()
  const selected = preps.find(p => p.id === selectedId) ?? null
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    setError(null); setPlanError(null)
    startTransition(guard(async () => {
      try {
        const r = await createInterviewPrep({ company: form.company, role: form.role, round: form.round, jd: form.jd, date: form.date, startMin: form.time ? fromHHMM(form.time) : null, minutes: form.minutes })
        setPreps(prev => [r.prep, ...prev])
        setSelectedId(r.prep.id)
        setPlanError(r.error)
        if (r.session) onSession(r.session)
        setForm(f => ({ ...f, company: '', role: '', jd: '' }))
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not build the plan') }
    }))
  }
  const retry = (id: string) => {
    setPlanError(null)
    startTransition(guard(async () => {
      const r = await retryInterviewPlan(id)
      if (r.prep) setPreps(prev => prev.map(p => p.id === id ? r.prep! : p))
      else setPlanError(r.error)
    }))
  }
  const remove = (p: InterviewPrep) => {
    setConfirmDelete(null)
    setPreps(prev => prev.filter(x => x.id !== p.id))
    if (selectedId === p.id) setSelectedId(null)
    startTransition(guard(() => deleteInterviewPrep(p.id)))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-[var(--grid-gap)] items-start">
      <div className="space-y-[var(--grid-gap)] min-w-0">
        <Card title="New interview prep">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={modalLabelClass}>Company</label><input value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Razorpay" className={modalInputClass()} /></div>
              <div><label className={modalLabelClass}>Role</label><input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Senior Frontend" className={modalInputClass()} /></div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_64px] gap-2">
              <div><label className={modalLabelClass}>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={modalInputClass()} /></div>
              <div><label className={modalLabelClass}>Time (IST)</label><input type="time" step={900} value={form.time} onChange={e => set('time', e.target.value)} className={modalInputClass()} /></div>
              <div><label className={modalLabelClass}>Min</label><input type="number" min={15} max={240} step={15} value={form.minutes} onChange={e => set('minutes', Number(e.target.value))} className={modalInputClass()} /></div>
            </div>
            <div><label className={modalLabelClass}>Round</label>
              <select value={form.round} onChange={e => set('round', e.target.value)} className={modalInputClass()}>{ROUNDS.map(r => <option key={r}>{r}</option>)}</select>
            </div>
            <div><label className={modalLabelClass}>Job description</label>
              <textarea value={form.jd} onChange={e => set('jd', e.target.value)} rows={9} placeholder="Paste the full job description" className={modalInputClass()} />
            </div>
            {error && <p className="text-[12px] text-risk">{error}</p>}
            <button onClick={submit} disabled={busy || !form.company.trim() || form.jd.trim().length < 80} className={`${modalSaveButtonClass} w-full inline-flex items-center justify-center gap-1.5`}>
              <Sparkles size={13} /> {busy ? 'Building your plan…' : 'Build prep plan'}
            </button>
            <p className="text-[11px] text-fg-tertiary">Matches the JD to your Question Bank and stories, writes an AI plan (Haiku 5.5, about $0.002), and sets the interview in that day&apos;s plan with its topics first.</p>
          </div>
        </Card>

        {preps.length > 0 && (
          <Card title={`Interviews · ${preps.length}`}>
            <ul className="space-y-1">
              {preps.map(p => (
                <li key={p.id}>
                  <button onClick={() => setSelectedId(p.id)} className={`w-full text-left rounded-[8px] border border-l-[3px] px-2.5 py-1.5 transition-colors ${p.id === selectedId ? 'border-surface-3 border-l-accent bg-accent-soft' : `border-surface-3 ${p.interview_date >= today ? 'border-l-warn' : 'border-l-border-strong'} hover:bg-surface-2`}`}>
                    <p className="text-[12.5px] font-semibold text-fg-primary truncate">{p.company}{p.role ? ` · ${p.role}` : ''}</p>
                    <p className="text-[11px] text-fg-tertiary">{whenLabel(p)}{p.round ? ` · ${p.round}` : ''}{p.research ? ' · researched' : ''}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {selected ? <PrepDetail prep={selected} today={today} busy={busy} planError={planError} onRetry={() => retry(selected.id)} onDelete={() => setConfirmDelete(selected)} onOpenTopic={onOpenTopic} />
        : <Card><p className="text-[12.5px] text-fg-tertiary py-6 text-center">Got an interview? Paste its job description on the left to get a prep plan.</p></Card>}

      {confirmDelete && (
        <ConfirmDialog title="Delete this prep?" description={`${confirmDelete.company} — the JD, plan and research will be removed.`} onCancel={() => setConfirmDelete(null)} onConfirm={() => remove(confirmDelete)} />
      )}
    </div>
  )
}

function PrepDetail({ prep, today, busy, planError, onRetry, onDelete, onOpenTopic }: {
  prep: InterviewPrep; today: string; busy: boolean; planError: string | null
  onRetry: () => void; onDelete: () => void; onOpenTopic: (category: string, topic: string) => void
}) {
  const m = prep.matched
  const plan = prep.plan
  const research = prep.research
  const links = searchLinks(prep.company, prep.role, today)
  const competency = (k: string) => COMPETENCIES.find(c => c.key === k)?.label ?? k
  return (
    <div className="space-y-[var(--grid-gap)] min-w-0">
      <Card title={`${prep.company}${prep.role ? ` · ${prep.role}` : ''}`} action={
        <button onClick={onDelete} aria-label="Delete prep" className="text-fg-quaternary hover:text-risk p-0.5"><Trash2 size={13} /></button>
      }>
        <p className="text-[12.5px] text-fg-secondary">{whenLabel(prep)} · {prep.minutes} min{prep.round ? ` · ${prep.round}` : ''}</p>
        {plan?.roleRead && <p className="text-[13px] text-fg-primary mt-1.5 leading-relaxed">{plan.roleRead}</p>}
        {m && m.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">{m.skills.map(s => <span key={s.label} className={chip}>{s.label}{s.hits > 1 ? ` ×${s.hits}` : ''}</span>)}</div>
        )}
      </Card>

      {(planError || (!plan && !busy)) && (
        <div className="flex items-center justify-between gap-2 rounded-[8px] border border-surface-3 border-l-[3px] border-l-warn bg-surface-1 px-2.5 py-2">
          <p className="text-[12px] text-fg-secondary">AI plan unavailable{planError ? ` — ${planError}` : ''}. The match below still works.</p>
          <button onClick={onRetry} disabled={busy} className="text-[12px] text-accent hover:underline inline-flex items-center gap-1 shrink-0"><RotateCcw size={11} /> Retry</button>
        </div>
      )}

      {plan && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-[var(--grid-gap)] items-start">
          <Card title={`Likely questions · ${plan.questions.length}`}>
            <ol className="space-y-1.5">
              {plan.questions.map((q, i) => (
                <li key={i} className="text-[12.5px]">
                  <p className="text-fg-primary font-medium leading-snug">{i + 1}. {q.q}</p>
                  <p className="text-[11px] text-fg-tertiary"><span className={chip}>{q.type}</span> {q.why}</p>
                </li>
              ))}
            </ol>
          </Card>
          <div className="space-y-[var(--grid-gap)] min-w-0">
            {plan.timeline.length > 0 && (
              <Card title="Plan until the interview">
                <ul className="space-y-1">
                  {plan.timeline.map((t, i) => (
                    <li key={i} className="grid grid-cols-[108px_1fr] gap-2 text-[12px]"><span className="text-fg-tertiary tabular-nums">{t.when}</span><span className="text-fg-primary">{t.what}</span></li>
                  ))}
                </ul>
              </Card>
            )}
            <Card title="Focus areas">
              <ul className="space-y-1">{plan.focusAreas.map((f, i) => <li key={i} className="text-[12.5px]"><span className="font-semibold text-fg-primary">{f.area}</span> <span className="text-fg-secondary">— {f.why}</span></li>)}</ul>
              {plan.rounds.length > 0 && <>
                <p className={`${label} mt-2.5 mb-1`}>Likely rounds</p>
                <ul className="space-y-0.5">{plan.rounds.map((r, i) => <li key={i} className="text-[12px]"><span className="font-semibold text-fg-primary">{r.name}</span> <span className="text-fg-secondary">— {r.what}</span></li>)}</ul>
              </>}
              {plan.prepareFor.length > 0 && <>
                <p className={`${label} mt-2.5 mb-1`}>Prepare for</p>
                <ul className="list-disc pl-4 text-[12px] text-fg-secondary space-y-0.5">{plan.prepareFor.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </>}
              {plan.askThem.length > 0 && <>
                <p className={`${label} mt-2.5 mb-1`}>Ask them</p>
                <ul className="list-disc pl-4 text-[12px] text-fg-secondary space-y-0.5">{plan.askThem.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </>}
            </Card>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <Card title={`Practise from your bank · ${m?.questions.length ?? 0}`}>
          {m && m.questions.length > 0 ? (
            <ul className="space-y-1">
              {m.questions.map(q => (
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
          {m && m.gaps.length > 0 && <>
            <p className={`${label} mt-3 mb-1`}>Your coverage of these areas</p>
            <ul className="space-y-0.5">
              {m.gaps.map(g => {
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
          {m && m.stories.length > 0 && <>
            <p className={`${label} mt-3 mb-1`}>Stories to have ready</p>
            <ul className="space-y-0.5">{m.stories.map(s => <li key={s.id} className="text-[12px]"><span className="text-fg-primary">{s.title}</span> <span className="text-fg-tertiary">· {s.competencies.map(competency).join(', ')}</span></li>)}</ul>
          </>}
        </Card>

        <Card title="Interview experiences online" action={research ? <span className="text-[11px] text-fg-tertiary">researched {research.updatedAt.slice(0, 10)}</span> : undefined}>
          {plan && plan.knownFor.length > 0 && <>
            <p className={`${label} mb-1`}>Known for (model knowledge, may be dated)</p>
            <ul className="list-disc pl-4 text-[12px] text-fg-secondary space-y-0.5 mb-2.5">{plan.knownFor.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </>}
          {research ? <>
            {research.summary && <p className="text-[12.5px] text-fg-primary leading-relaxed mb-2">{research.summary}</p>}
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
            <p className="text-[12px] text-fg-secondary mb-2">For live research (recent experiences and the most-asked questions, with sources), run <code className="text-[11.5px] bg-surface-2 rounded px-1">/interview-prep {prep.company}</code> in Claude Code — it saves here.</p>
          )}
          <p className={`${label} mt-2 mb-1`}>Search the last 12 months</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent hover:underline inline-flex items-center gap-1"><ExternalLink size={11} /> {l.label}</a>)}
          </div>
        </Card>
      </div>
    </div>
  )
}
