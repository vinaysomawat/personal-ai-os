'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import Card from '@/components/Card'
import { modalInputClass, modalSelectClass, modalSaveButtonClass } from '@/components/Modal'
import { todayIST } from '@/lib/date'
import { addOutreach, deleteOutreach, updateOutreach } from '../actions'
import { OUTREACH_CHANNELS, OUTREACH_STATUSES, addDays, funnel, pct, type Outreach, type OutreachChannel, type OutreachStatus } from '../pipeline'
import type { Application, InterviewRound } from '../types'

const STATUS_CLS: Record<OutreachStatus, string> = {
  sent: 'text-fg-secondary', replied: 'text-accent', referred: 'text-good', screen: 'text-good', no_response: 'text-fg-tertiary', closed: 'text-fg-tertiary',
}
const label = (s: string) => s.replace('_', ' ')
const short = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })

// Pipeline (v4.0 §4.5): outreach → replies → screens → onsites → offers,
// this week and the 4 before, with conversion between stages, plus the
// outreach log (follow-ups due highlighted).
export default function PipelineTab({ outreach, apps, rounds, target, onOutreach }: {
  outreach: Outreach[]; apps: Application[]; rounds: InterviewRound[]; target: number
  onOutreach: (fn: (prev: Outreach[]) => Outreach[]) => void
}) {
  const [, start] = useTransition()
  const [busy, startAdd] = useTransition()
  const [f, setF] = useState({ company: '', person: '', channel: 'referral' as OutreachChannel, count: '1', notes: '' })
  const today = todayIST()
  const weeks = funnel(outreach, apps, rounds, today)
  const thisWeek = weeks[0]
  const due = (o: Outreach) => o.status === 'sent' && !!o.follow_up_on && o.follow_up_on <= today
  const sorted = [...outreach].sort((a, b) => Number(due(b)) - Number(due(a)) || b.sent_at.localeCompare(a.sent_at))
  const patch = (o: Outreach, p: Partial<Outreach>) => { onOutreach(prev => prev.map(x => x.id === o.id ? { ...x, ...p } : x)); start(() => updateOutreach(o.id, p as { status?: OutreachStatus; follow_up_on?: string | null })) }
  const bottleneck = (() => {
    const w = weeks.reduce((s, x) => ({ sent: s.sent + x.sent, replies: s.replies + x.replies, screens: s.screens + x.screens, onsites: s.onsites + x.onsites, offers: s.offers + x.offers }), { sent: 0, replies: 0, screens: 0, onsites: 0, offers: 0 })
    if (thisWeek.sent < target) return `Volume: ${thisWeek.sent}/${target} outreach this week — send ${target - thisWeek.sent} more before anything else.`
    if (w.sent >= 20 && w.replies / w.sent < 0.1) return 'Reply rate under 10% — switch from cold applications to referrals and recruiter DMs.'
    if (w.screens >= 3 && w.onsites / w.screens < 0.3) return 'Screens aren\'t converting — your bottleneck is the first interview: drill intros, fundamentals, mock screens.'
    if (w.onsites >= 2 && w.offers === 0) return 'Late-stage rounds aren\'t closing — system design and behavioral depth, run full mocks.'
    return 'Volume and conversion are on track — keep the outreach cadence.'
  })()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[var(--grid-gap)] items-start">
      <div className="space-y-[var(--grid-gap)]">
        <Card title="Funnel" action={<span className={`text-[11px] font-semibold tabular-nums ${thisWeek.sent >= target ? 'text-good' : 'text-warn'}`}>This week {thisWeek.sent}/{target}</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] tabular-nums">
              <thead><tr className="text-fg-tertiary text-left">
                <th className="font-medium py-1">Week of</th><th className="font-medium">Outreach</th><th className="font-medium">Replies</th><th className="font-medium">Screens</th><th className="font-medium">Onsites</th><th className="font-medium">Offers</th>
              </tr></thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr key={w.week} className={`border-t border-surface-3 ${i === 0 ? 'font-semibold text-fg-primary' : 'text-fg-secondary'}`}>
                    <td className="py-1.5">{i === 0 ? 'This week' : short(w.week)}</td>
                    <td>{w.sent}</td>
                    <td>{w.replies} <span className="text-fg-tertiary font-normal">{pct(w.replies, w.sent)}</span></td>
                    <td>{w.screens} <span className="text-fg-tertiary font-normal">{pct(w.screens, w.replies)}</span></td>
                    <td>{w.onsites} <span className="text-fg-tertiary font-normal">{pct(w.onsites, w.screens)}</span></td>
                    <td>{w.offers} <span className="text-fg-tertiary font-normal">{pct(w.offers, w.onsites)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-fg-secondary mt-2"><span className="font-semibold text-fg-primary">Bottleneck:</span> {bottleneck}</p>
          <p className="text-[10.5px] text-fg-tertiary mt-1">% = conversion from the previous stage. Screens = companies added on the Companies tab (a phone screen booked); onsites = ones that reached a technical / onsite round.</p>
        </Card>

        <Card title="Outreach" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{outreach.filter(due).length} follow-up{outreach.filter(due).length === 1 ? '' : 's'} due</span>}>
          {sorted.length === 0 ? <p className="text-[12px] text-fg-tertiary">Nothing logged yet — add referrals, recruiter DMs and batches of applications, here or by telling the Career bot.</p> : (
            <ul className="flex flex-col gap-1">
              {sorted.map(o => (
                <li key={o.id} className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] px-2 py-1.5 ${due(o) ? 'bg-warn-soft' : 'bg-surface-2'}`}>
                  <span className="text-[12.5px] font-semibold text-fg-primary">{o.person ? `${o.person} · ` : ''}{o.company}</span>
                  <span className="text-[11px] text-fg-tertiary">{o.channel}{o.count > 1 ? ` × ${o.count}` : ''} · {short(o.sent_at)}{o.follow_up_on && o.status === 'sent' ? ` · follow up ${short(o.follow_up_on)}` : ''}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {due(o) && <button onClick={() => patch(o, { follow_up_on: addDays(today, 5) })} className="text-[11px] text-accent hover:underline">Mark followed up</button>}
                    <select value={o.status} onChange={e => patch(o, { status: e.target.value as OutreachStatus })} aria-label="Status" className={`bg-surface-1 border border-surface-3 rounded-[6px] px-1.5 py-[2px] text-[11.5px] font-semibold ${STATUS_CLS[o.status]}`}>
                      {OUTREACH_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                    <button onClick={() => { onOutreach(prev => prev.filter(x => x.id !== o.id)); start(() => deleteOutreach(o.id)) }} aria-label="Delete" className="text-fg-quaternary hover:text-risk"><Trash2 size={12} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Log outreach">
        <form className="flex flex-col gap-2" onSubmit={e => {
          e.preventDefault()
          if (!f.company.trim()) return
          startAdd(async () => {
            const row = await addOutreach({ company: f.company, person: f.person || null, channel: f.channel, count: Number(f.count) || 1, notes: f.notes || null })
            onOutreach(prev => [row, ...prev])
            setF({ ...f, company: '', person: '', count: '1', notes: '' })
          })
        }}>
          <input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} placeholder="Company (or 'Various' for a batch)" className={modalInputClass()} />
          <input value={f.person} onChange={e => setF({ ...f, person: e.target.value })} placeholder="Person (optional)" className={modalInputClass()} />
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <select value={f.channel} onChange={e => setF({ ...f, channel: e.target.value as OutreachChannel })} aria-label="Channel" className={modalSelectClass}>
              {OUTREACH_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" min={1} value={f.count} onChange={e => setF({ ...f, count: e.target.value })} aria-label="Count" className={modalInputClass()} />
          </div>
          <input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Notes (optional)" className={modalInputClass()} />
          <button type="submit" disabled={busy || !f.company.trim()} className={modalSaveButtonClass}>{busy ? 'Saving…' : 'Log'}</button>
          <p className="text-[10.5px] text-fg-tertiary">Referral / LinkedIn / recruiter outreach gets a follow-up date 5 days out. Use count for a batch of applications. Target {target}/week — set it in Prep&apos;s Job Hunt Mode strip.</p>
        </form>
      </Card>
    </div>
  )
}
