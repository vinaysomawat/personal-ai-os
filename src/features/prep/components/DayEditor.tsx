'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Scissors, X } from 'lucide-react'
import Card from '@/components/Card'
import { modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { savePrepTemplate } from '../actions'
import { DEBRIEF_MINUTES, ORDER, PLAN_LABEL, WARMUP_MINUTES, layoutDay, mealsOf, type DayBreak, type DayTemplate, type Interview, type PlanKey, type TodayPatch } from '../dayplan'
import { clock, hm } from '../war'
import { span } from '../timeline'
import type { PrepBlock } from '../types'
import { baseKey } from '../hunt'

// Edit today / Edit default plan — both keep a draft with a live preview and
// save only on Save (nothing is written while you change fields).

const INPUT = 'bg-surface-2 border border-border-strong rounded-[6px] px-1.5 py-[3px] text-[12px] text-fg-primary outline-none focus:border-accent'
const toHHMM = (min: number) => { const m = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
const fromHHMM = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m }
// Times before the 4am rollover belong to the end of the day (prep minutes).
const prepMin = (v: string) => { const m = fromHHMM(v); return m < 4 * 60 ? m + 1440 : m }
// The key for one more slot of a plan item: the plain key if free, else `<key>~<n>`.
const nextKey = (base: string, used: Set<string>) => { if (!used.has(base)) return base; let n = 2; while (used.has(`${base}~${n}`)) n++; return `${base}~${n}` }
const num = (v: string, fallback: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : fallback }

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p className="text-[12px] text-risk">{error}</p> : null
}

// ---------------- Edit today ----------------

type Item = { key: string; minutes: number; label: string; done: boolean }

// Only what changed between the saved day and the draft (dayplan.ts
// TodayPatch): the order is sent only when slots were moved.
function diffToday(saved: { startMin: number; interview: Interview | null; breaks: DayBreak[]; blocks: PrepBlock[] }, draft: { startMin: number; interview: Interview | null; breaks: DayBreak[]; items: Item[] }): TodayPatch {
  const p: TodayPatch = {}
  if (draft.startMin !== saved.startMin) p.startMin = draft.startMin
  if (JSON.stringify(draft.interview) !== JSON.stringify(saved.interview)) p.interview = draft.interview
  if (JSON.stringify(draft.breaks) !== JSON.stringify(saved.breaks)) p.breaks = draft.breaks
  const before = new Map(saved.blocks.map(b => [b.key, b]))
  const after = new Set(draft.items.map(i => i.key))
  const remove = saved.blocks.filter(b => !after.has(b.key)).map(b => b.key)
  const add = draft.items.filter(i => !before.has(i.key)).map(i => ({ key: i.key, minutes: i.minutes, ...(i.key.startsWith('custom:') ? { label: i.label } : {}) }))
  const minutes: Record<string, number> = {}, labels: Record<string, string> = {}
  for (const i of draft.items) {
    const b = before.get(i.key)
    if (!b) continue
    if (b.minutes !== i.minutes) minutes[i.key] = i.minutes
    if (i.key.startsWith('custom:') && b.label !== i.label) labels[i.key] = i.label
  }
  if (remove.length) p.remove = remove
  if (add.length) p.add = add
  if (Object.keys(minutes).length) p.minutes = minutes
  if (Object.keys(labels).length) p.labels = labels
  // Removing and appending keep the rest in place; anything else is a move.
  const expected = [...saved.blocks.map(b => b.key).filter(k => after.has(k)), ...add.map(a => a.key)]
  const order = draft.items.map(i => i.key)
  if (expected.join() !== order.join()) p.order = order
  return p
}

export function EditToday({ template, startMin, interview, breaks: savedBreaks, blocks, focus, error: saveError, onSave, onCancel }: {
  template: DayTemplate
  startMin: number
  interview: Interview | null
  breaks: DayBreak[]
  blocks: PrepBlock[]
  // Open with the interview section ready to fill (the Interview button).
  focus: 'items' | 'interview'
  // A failed save, shown when the editor reopens.
  error: string | null
  // Applies the patch at once and saves it behind (PrepView).
  onSave: (patch: TodayPatch) => void
  onCancel: () => void
}) {
  const [start, setStart] = useState(startMin)
  const [iv, setIv] = useState<Interview | null>(interview ?? (focus === 'interview' ? { start: Math.max(startMin + 60, 15 * 60), minutes: 60, label: '' } : null))
  const [breaks, setBreaks] = useState<DayBreak[]>(() => savedBreaks.filter(b => b.meal === undefined))
  // Lunch / dinner for today — saved only where they differ from the default plan.
  const [meals, setMeals] = useState<DayBreak[]>(() => mealsOf(template, savedBreaks))
  const allBreaks = useMemo(() => {
    const base = mealsOf(template, [])
    return [...breaks, ...meals.filter((m, i) => m.start !== base[i].start || m.end !== base[i].end || (m.label ?? '') !== (base[i].label ?? ''))]
  }, [breaks, meals, template])
  const setMeal = (i: number, p: Partial<DayBreak>) => setMeals(prev => prev.map((x, k) => k === i ? { ...x, ...p } : x))
  const [items, setItems] = useState<Item[]>(() => blocks.map(b => ({ key: b.key, minutes: b.minutes, label: b.label, done: b.done })))
  const [adding, setAdding] = useState('')
  const [error, setError] = useState<string | null>(saveError)
  const preview = useMemo(() => layoutDay(items.map(i => ({ key: i.key, label: i.label, minutes: i.minutes, done: i.done, detail: '', href: '' })), template, start, iv, allBreaks), [items, template, start, iv, allBreaks])
  const used = new Set(items.map(i => i.key))
  // Every plan item can be added again as another slot (the mock is one a day).
  const addable = ORDER.filter(k => k !== 'mock' || !used.has(k))
  const split = (i: number) => setItems(prev => {
    const it = prev[i]
    const first = Math.max(5, Math.round(it.minutes / 10) * 5)
    const keys = new Set(prev.map(x => x.key))
    return [...prev.slice(0, i), { ...it, minutes: first }, { key: nextKey(baseKey(it.key), keys), minutes: it.minutes - first, label: it.label, done: false }, ...prev.slice(i + 1)]
  })
  const move = (i: number, d: -1 | 1) => setItems(prev => { const n = [...prev]; const j = i + d; if (j < 0 || j >= n.length) return prev; [n[i], n[j]] = [n[j], n[i]]; return n })
  const patch = (i: number, p: Partial<Item>) => setItems(prev => prev.map((x, k) => k === i ? { ...x, ...p } : x))
  const add = () => {
    if (!adding) return
    const key = adding === 'custom' ? `custom:${Date.now()}` : nextKey(adding, used)
    const minutes = adding === 'custom' ? 30 : template.minutes[adding] || 30
    setItems(prev => [...prev, { key, minutes, label: adding === 'custom' ? '' : PLAN_LABEL[adding as PlanKey], done: false }])
    setAdding('')
  }
  const save = () => {
    setError(null)
    if (items.some(i => i.key.startsWith('custom:') && !i.label.trim())) { setError('Name your own slots'); return }
    if (breaks.some(b => b.end <= b.start)) { setError('Each break needs its end after its start'); return }
    if (meals.some(m => m.end <= m.start)) { setError('Each meal needs its end after its start'); return }
    onSave(diffToday({ startMin, interview, breaks: savedBreaks, blocks }, { startMin: start, interview: iv, breaks: allBreaks, items }))
  }
  const total = items.reduce((s, i) => s + i.minutes, 0)
  return (
    <Card title="Edit today" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{items.length} slots · {hm(total)}</span>}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 items-start">
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-fg-secondary">
            <label className="inline-flex items-center gap-1.5">Day starts
              <input type="time" step={900} value={toHHMM(start)} onChange={e => e.target.value && setStart(fromHHMM(e.target.value))} className={INPUT} />
            </label>
            <span className="text-fg-tertiary">only the first session moves</span>
          </div>
          <div className="rounded-[9px] border border-border px-2.5 py-2">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-fg-primary">
              <input type="checkbox" checked={!!iv} onChange={e => setIv(e.target.checked ? { start: Math.max(start + 60, 15 * 60), minutes: 60, label: '' } : null)} /> 🎤 Interview today
            </label>
            {iv && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-fg-secondary">
                <input type="time" step={300} value={toHHMM(iv.start)} onChange={e => e.target.value && setIv({ ...iv, start: prepMin(e.target.value) })} className={INPUT} aria-label="Interview time" />
                <input type="number" min={15} max={240} step={15} value={iv.minutes} onChange={e => setIv({ ...iv, minutes: num(e.target.value, 60) })} className={`${INPUT} w-[64px]`} aria-label="Interview minutes" /> min
                <input value={iv.label ?? ''} onChange={e => setIv({ ...iv, label: e.target.value })} placeholder="Company / round (optional)" className={`${INPUT} flex-1 min-w-[140px]`} />
                <span className="w-full text-[11px] text-fg-tertiary">Adds a {WARMUP_MINUTES}-min warm-up before and a {DEBRIEF_MINUTES}-min debrief after; before your start time it starts the day early.</span>
              </div>
            )}
          </div>
          <div className="rounded-[9px] border border-border px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-fg-primary">☕ Meals & breaks</p>
              <button onClick={() => { const last = breaks[breaks.length - 1]; const s0 = last ? last.end + 120 : Math.max(start + 120, 16 * 60); setBreaks(prev => [...prev, { start: s0, end: s0 + 20 }]) }}
                className={`${modalCancelButtonClass} !py-[3px] inline-flex items-center gap-1`}><Plus size={12} /> Add break</button>
            </div>
            <ol className="flex flex-col gap-1 mt-1">
              {meals.map((m, i) => (
                <li key={`meal${i}`} className="flex flex-wrap items-center gap-1.5 text-[12px] text-fg-secondary">
                  <input type="time" step={300} value={toHHMM(m.start)} onChange={e => e.target.value && setMeal(i, { start: prepMin(e.target.value) })} className={INPUT} aria-label="Meal starts" />
                  –
                  <input type="time" step={300} value={toHHMM(m.end)} onChange={e => e.target.value && setMeal(i, { end: prepMin(e.target.value) })} className={INPUT} aria-label="Meal ends" />
                  <span className="tabular-nums text-fg-tertiary">{m.end > m.start ? hm(m.end - m.start) : 'end before start'}</span>
                  <input value={m.label ?? ''} onChange={e => setMeal(i, { label: e.target.value })} placeholder="Name" className={`${INPUT} flex-1 min-w-[110px]`} />
                  <span className="w-[14px]" />
                </li>
              ))}
            </ol>
            {breaks.length === 0 && <p className="text-[11px] text-fg-tertiary mt-1">No breaks — add one with its start and end time; blocks flow around it.</p>}
            <ol className="flex flex-col gap-1 mt-1">
              {breaks.map((b, i) => (
                <li key={i} className="flex flex-wrap items-center gap-1.5 text-[12px] text-fg-secondary">
                  <input type="time" step={300} value={toHHMM(b.start)} onChange={e => e.target.value && setBreaks(prev => prev.map((x, k) => k === i ? { ...x, start: prepMin(e.target.value) } : x))} className={INPUT} aria-label="Break starts" />
                  –
                  <input type="time" step={300} value={toHHMM(b.end)} onChange={e => e.target.value && setBreaks(prev => prev.map((x, k) => k === i ? { ...x, end: prepMin(e.target.value) } : x))} className={INPUT} aria-label="Break ends" />
                  <span className="tabular-nums text-fg-tertiary">{b.end > b.start ? hm(b.end - b.start) : 'end before start'}</span>
                  <input value={b.label ?? ''} onChange={e => setBreaks(prev => prev.map((x, k) => k === i ? { ...x, label: e.target.value } : x))} placeholder="Name (optional)" className={`${INPUT} flex-1 min-w-[110px]`} />
                  <button onClick={() => setBreaks(prev => prev.filter((_, k) => k !== i))} aria-label="Remove break" className="text-fg-tertiary hover:text-risk"><X size={14} /></button>
                </li>
              ))}
            </ol>
          </div>
          <ol className="flex flex-col gap-1">
            {items.map((it, i) => (
              <li key={it.key} className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-1.5 rounded-[8px] px-1.5 py-1 ${it.done ? 'bg-good-soft' : 'bg-surface-2'}`}>
                <span className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="text-fg-tertiary hover:text-accent disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="text-fg-tertiary hover:text-accent disabled:opacity-30"><ArrowDown size={12} /></button>
                </span>
                {it.key.startsWith('custom:')
                  ? <input value={it.label} onChange={e => patch(i, { label: e.target.value })} placeholder="Your slot, e.g. Call with recruiter" className={`${INPUT} min-w-0`} />
                  : <span className="text-[12.5px] text-fg-primary truncate">{it.done && '✓ '}{it.label}{it.key.includes('~') && <span className="text-fg-tertiary"> · slot {it.key.split('~')[1]}</span>}</span>}
                <span className="inline-flex items-center gap-1 text-[11px] text-fg-tertiary">
                  {it.key === 'mock'
                    ? <span className="tabular-nums">{it.minutes}</span>
                    : <input type="number" min={5} max={300} step={5} value={it.minutes} onChange={e => patch(i, { minutes: num(e.target.value, it.minutes) })} className={`${INPUT} w-[58px] tabular-nums`} aria-label="Minutes" />}
                  min
                </span>
                {it.key !== 'mock' && it.minutes >= 10 && !it.done
                  ? <button onClick={() => split(i)} aria-label="Split into two slots" title="Split into two slots" className="text-fg-tertiary hover:text-accent"><Scissors size={13} /></button>
                  : <span className="w-[13px]" />}
                <button onClick={() => setItems(prev => prev.filter((_, k) => k !== i))} aria-label="Remove" className="text-fg-tertiary hover:text-risk"><X size={14} /></button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-1.5">
            <select value={adding} onChange={e => setAdding(e.target.value)} className={INPUT} aria-label="Add a slot">
              <option value="">Add a slot…</option>
              {addable.map(k => <option key={k} value={k}>{PLAN_LABEL[k]}{used.has(k) ? ' — another slot' : ''}</option>)}
              <option value="custom">Your own slot…</option>
            </select>
            <button onClick={add} disabled={!adding} className={`${modalCancelButtonClass} !py-[4px] inline-flex items-center gap-1 disabled:opacity-40`}><Plus size={12} /> Add</button>
          </div>
          <ErrorLine error={error} />
          <div className="flex gap-2">
            <button onClick={save} className={`${modalSaveButtonClass} !py-[6px]`}>Save</button>
            <button onClick={onCancel} className={`${modalCancelButtonClass} !py-[6px]`}>Cancel</button>
          </div>
        </div>
        <div className="rounded-[9px] border border-border p-2 min-w-0">
          <p className="text-[11px] font-semibold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Preview</p>
          <ol className="flex flex-col">
            {preview.rows.map((r, i) => (
              <li key={i} className="grid grid-cols-[96px_1fr] gap-2 text-[11.5px] py-[2px]">
                <span className="tabular-nums text-fg-tertiary">{span(r)}</span>
                <span className={`truncate ${r.kind === 'block' ? 'text-fg-primary font-medium' : 'text-fg-tertiary'}`}>{r.label}</span>
              </li>
            ))}
          </ol>
          {preview.dropped.length > 0 && <p className="text-[11.5px] text-warn mt-1.5">Doesn&apos;t fit: {preview.dropped.map(b => b.label).join(', ')} — shorten or remove slots.</p>}
        </div>
      </div>
    </Card>
  )
}

// ---------------- Edit default plan ----------------

export function EditDefaultPlan({ template, dayStartMin, onCancel }: {
  template: DayTemplate
  dayStartMin: number
  onCancel: () => void
}) {
  const router = useRouter()
  const [start, setStart] = useState(dayStartMin)
  const [t, setT] = useState<DayTemplate>(() => structuredClone(template))
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const setSession = (i: number, p: Partial<DayTemplate['sessions'][number]>) => setT(prev => ({ ...prev, sessions: prev.sessions.map((s, k) => k === i ? { ...s, ...p } : s) }))
  // Times after midnight belong to the end of the day.
  const sessionMin = (v: string) => { const m = fromHHMM(v); return m < start - 60 ? m + 1440 : m }
  const setMinutes = (key: string, v: number) => setT(prev => ({ ...prev, minutes: { ...prev.minutes, [key]: Math.max(0, v) } }))
  const total = Object.entries(t.minutes).reduce((s, [k, v]) => s + (k === 'mock' ? 0 : v), 0)
  const capacity = t.sessions.reduce((s, x, i) => s + (x.end - (i === 0 ? start : x.start)), 0)
  const save = () => {
    setError(null)
    startSave(async () => {
      try { await savePrepTemplate({ ...t, sessions: t.sessions.map((s, i) => i === 0 ? { ...s, start } : s) }, start); router.refresh(); onCancel() }
      catch (e) { setError(e instanceof Error ? e.message : 'Could not save') }
    })
  }
  return (
    <Card title="Default plan" action={<span className="text-[11px] text-fg-tertiary">applies from tomorrow&apos;s plan</span>}>
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Sessions</p>
          <ol className="flex flex-col gap-1">
            {t.sessions.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 text-[12px] text-fg-secondary">
                <input value={s.label} onChange={e => setSession(i, { label: e.target.value })} className={`${INPUT} w-[110px]`} aria-label="Session name" />
                <input type="time" step={900} value={toHHMM(i === 0 ? start : s.start)} onChange={e => e.target.value && (i === 0 ? setStart(fromHHMM(e.target.value)) : setSession(i, { start: sessionMin(e.target.value) }))} className={INPUT} aria-label="Starts" />
                –
                <input type="time" step={900} value={toHHMM(s.end)} onChange={e => e.target.value && setSession(i, { end: sessionMin(e.target.value) })} className={INPUT} aria-label="Ends" />
                {i < t.sessions.length - 1 && (
                  <input value={t.gaps[i] ?? ''} onChange={e => setT(prev => ({ ...prev, gaps: prev.sessions.slice(1).map((_, k) => k === i ? e.target.value : prev.gaps[k] ?? '') }))} placeholder="Gap after, e.g. 🍽️ Lunch" className={`${INPUT} flex-1 min-w-[140px]`} aria-label="Gap after" />
                )}
              </li>
            ))}
          </ol>
          <p className="text-[11.5px] text-fg-tertiary mt-1.5 tabular-nums">{hm(capacity)} of sessions a day · add breaks for a day in Edit today</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-fg-tertiary uppercase tracking-[0.4px] mb-1">Minutes per day <span className="normal-case font-normal">· the same every day</span></p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {ORDER.map(key => (
              <li key={key} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-fg-primary truncate">{PLAN_LABEL[key]}</span>
                {key === 'mock'
                  ? <label className="inline-flex items-center gap-1.5 text-[11px] text-fg-tertiary shrink-0"><input type="checkbox" checked={(t.minutes.mock ?? 0) > 0} onChange={e => setMinutes('mock', e.target.checked ? 1 : 0)} /> Sun · Tue · Thu · Sat</label>
                  : <span className="inline-flex items-center gap-1 text-[11px] text-fg-tertiary shrink-0"><input type="number" min={0} max={300} step={5} value={t.minutes[key] ?? 0} onChange={e => setMinutes(key, num(e.target.value, 0))} className={`${INPUT} w-[56px] text-center tabular-nums`} aria-label={`${PLAN_LABEL[key]} minutes a day`} /> min</span>}
              </li>
            ))}
          </ol>
          <p className={`text-[11.5px] mt-1.5 tabular-nums ${total > capacity ? 'text-risk font-semibold' : 'text-fg-tertiary'}`}>Total {hm(total)} + the mock on its days · {hm(capacity)} of sessions. 0 = off. Whatever is left in a session becomes Flex; sessions run {clock(start)}–{clock(t.sessions[t.sessions.length - 1]?.end ?? start)}.</p>
        </div>
        <ErrorLine error={error} />
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={`${modalSaveButtonClass} !py-[6px]`}>{saving ? 'Saving…' : 'Save'}</button>
          <button onClick={onCancel} disabled={saving} className={`${modalCancelButtonClass} !py-[6px]`}>Cancel</button>
        </div>
      </div>
    </Card>
  )
}
