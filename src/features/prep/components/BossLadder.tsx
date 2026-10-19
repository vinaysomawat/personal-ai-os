'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, Timer, X } from 'lucide-react'
import Card from '@/components/Card'
import MicButton, { appendText } from '@/components/MicButton'
import ConfirmDialog from '@/components/ConfirmDialog'
import { modalCancelButtonClass, modalSaveButtonClass } from '@/components/Modal'
import { abandonFightAction, answerFightAction, markFixReadAction, savePrepTargetDate } from '../actions'
import { CODING_BOSSES, MIN_ANSWER, bossesLeft, bossesPerDay, daysTo, fightMinutes, fightSize, winAt, type Boss, type Fight } from '../boss'
import type { WarReadiness } from '../war'
import AnswerReview, { CodeBlock } from './AnswerReview'
import type { PrepSession, PrepSettings, ReadinessAreaKey } from '../types'

const mmss = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`
const resultCls = (f: Pick<Fight, 'status'>) => f.status === 'won' ? 'text-good bg-good-soft' : 'text-risk bg-risk-soft'
const resultChip = (f: Fight) => `${f.status === 'won' ? '🏆' : '💀'} ${f.score ?? 0}`

// ---------------- Header + next boss ----------------

export function BossHeader({ ladder, settings, today }: { ladder: Boss[]; settings: PrepSettings; today: string }) {
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const left = bossesLeft(ladder)
  const days = daysTo(settings.target_date, today)
  const per = bossesPerDay(left, days)
  const save = (date: string) => startSave(async () => { await savePrepTargetDate(date || null); router.refresh() })
  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <p className="text-[13px] font-bold text-fg-primary">⚔️ Boss Ladder <span className="text-[11.5px] font-normal text-fg-tertiary">— every readiness area under its gate is a boss. Beat it in a timed fight, graded at the end.</span></p>
      <p className="text-[12.5px] mt-1 text-fg-primary tabular-nums flex flex-wrap items-center gap-x-1.5">
        <span className="font-bold">{left} boss{left === 1 ? '' : 'es'} left</span>
        <span className="text-fg-tertiary">·</span>
        {days !== null && <span className={days < 0 ? 'text-risk' : 'text-fg-secondary'}>{days < 0 ? `${-days}d past` : `${days}d to`}</span>}
        <input type="date" aria-label="Deadline" value={settings.target_date ?? ''} disabled={saving} onChange={e => save(e.target.value)}
          className="bg-transparent border-b border-dashed border-border-strong text-[12px] text-fg-secondary outline-none focus:border-accent w-[118px]" />
        {per !== null && left > 0 && <><span className="text-fg-tertiary">·</span><span className={per > 1 ? 'text-risk font-semibold' : 'text-fg-secondary'}>need {per}/day</span></>}
      </p>
    </Card>
  )
}

// The top undefeated boss, with its fight button (Read Fix card first when
// its last fight was lost and the card is unread).
export function NextBossCard({ boss, busy, error, onFight, onShowResult }: {
  boss: Boss | null
  busy: boolean
  error: string | null
  onFight: (area: ReadinessAreaKey) => void
  onShowResult: (f: Fight) => void
}) {
  if (!boss) return <Card title="Next boss"><p className="text-[13px] text-good font-semibold">🏆 Every boss is down. Final boss: a full loop — frontend screen, system design and behavioral mocks back to back.</p></Card>
  const n = fightSize(boss.key)
  const coding = CODING_BOSSES.includes(boss.key)
  return (
    <Card title="Next boss" action={<span className="text-[11px] text-fg-tertiary">biggest gap first · or tap any boss</span>}>
      {error && <p className="text-[12px] text-risk mb-2">{error}</p>}
      <div className="rounded-[12px] border border-accent bg-accent-soft px-3.5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-fg-primary leading-tight">{boss.state === 'open' ? 'Boss' : 'Rematch'}: {boss.label} <span className="text-[13px] font-semibold text-fg-tertiary tabular-nums">· {fightMinutes(boss.key)}m</span></p>
            <p className="text-[12px] text-fg-secondary mt-0.5">{coding ? 'One problem in your editor, paste the solution' : `${n} question${n === 1 ? '' : 's'}, timed, no hints`} · win at {winAt(boss.gate).toFixed(1)} avg, none under {MIN_ANSWER} · now {boss.score ?? '—'}/{boss.gate}</p>
          </div>
          {boss.state === 'fix' && boss.lastFight
            ? <button onClick={() => onShowResult(boss.lastFight!)} className={`${modalSaveButtonClass} !px-5 !py-2.5 !text-[14px]`}>Read Fix card</button>
            : <button disabled={busy} onClick={() => onFight(boss.key)} className={`${modalSaveButtonClass} inline-flex items-center gap-1.5 !px-5 !py-2.5 !text-[14px]`}><Swords size={15} />{busy ? 'Starting…' : boss.state === 'rematch' ? 'Rematch' : 'Fight'}</button>}
        </div>
      </div>
      <p className="text-[11px] text-fg-tertiary mt-2">Fight answers count as practiced questions, so they also tick Today&apos;s question blocks. Telegram: &quot;fight&quot;, &quot;fight system design&quot;, &quot;read&quot;.</p>
    </Card>
  )
}

// ---------------- The fight ----------------

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  return now
}

export function FightScreen({ fight, label, onChange, onAbandoned }: {
  fight: Fight
  label: string
  onChange: (f: Fight, session: PrepSession | null) => void
  onAbandoned: () => void
}) {
  const now = useNow()
  const it = fight.items[fight.current]
  const [answer, setAnswer] = useState('')
  const [spoken, setSpoken] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, start] = useTransition()
  // Each question's clock starts at the previous answer (survives reloads).
  const elapsed = Math.max(0, Math.round((now - new Date(fight.updated_at).getTime()) / 1000))
  const left = (it?.budget_seconds ?? 0) - elapsed
  const last = fight.current === fight.items.length - 1
  const coding = CODING_BOSSES.includes(fight.area)
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0
  if (!it) return null
  const submit = () => {
    setError(null)
    start(async () => {
      try {
        const { fight: f, session } = await answerFightAction(fight.id, answer, spoken, elapsed)
        if (!f) { setError('Couldn\'t save — try again.'); return }
        setAnswer(''); setSpoken(false)
        onChange(f, session)
      } catch (e) { setError(e instanceof Error ? e.message : 'Couldn\'t save — try again.') }
    })
  }
  return (
    <Card padding="p-[var(--card-pad-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-accent">⚔️ {label} · {fight.current + 1}/{fight.items.length} · win at {winAt(fight.gate).toFixed(1)}, none under {MIN_ANSWER}</p>
          <p className="text-[15px] font-bold text-fg-primary leading-snug mt-1">{it.title}</p>
        </div>
        <div className={`shrink-0 text-right tabular-nums ${left < 0 ? 'text-risk' : left < 60 ? 'text-warn' : 'text-fg-primary'}`}>
          <p className="text-[20px] font-bold leading-none inline-flex items-center gap-1"><Timer size={15} />{mmss(left)}</p>
          <p className="text-[10.5px] text-fg-tertiary mt-1">{left < 0 ? 'over time' : `of ${mmss(it.budget_seconds)}`}</p>
        </div>
      </div>
      {coding && (
        <div className="mt-2 text-[12.5px] text-fg-secondary">
          {it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Open the problem ↗</a>
            : it.hints && <p><span className="font-semibold text-fg-primary">Requirements:</span> {it.hints}</p>}
          <p className="text-[11.5px] text-fg-tertiary mt-0.5">Solve it in your editor, then paste the solution and the trade-offs below.</p>
        </div>
      )}
      {it.body && <CodeBlock code={it.body} />}
      <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={coding || it.category === 'system-design' || it.category === 'code-review' ? 12 : 7} autoFocus disabled={busy}
        placeholder={coding ? 'Paste your solution: the code, then structure, state, edge cases, complexity, what you would do with more time.'
          : it.category === 'system-design' ? 'Requirements → Architecture → Data model → Interface (API) → Optimizations. Talk it through as you write.'
          : it.category === 'code-review' ? 'Issues by severity: what, where, why it matters, the fix.'
          : 'Answer as if they\'re listening — speak it or type it. Graded at the end.'}
        className="mt-3 w-full bg-surface-2 border border-surface-3 rounded-[8px] px-3 py-2 text-[13px] text-fg-primary outline-none focus:border-accent resize-y" />
      {error && <p className="text-[12px] text-risk mt-1">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <span className="inline-flex items-center gap-2 min-w-0">
          <MicButton key={fight.current} onText={text => { setAnswer(prev => appendText(prev, text)); setSpoken(true) }} />
          <span className="text-[11px] text-fg-tertiary tabular-nums truncate">{words} words · no hints until the end</span>
        </span>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setConfirmQuit(true)} disabled={busy} className={`${modalCancelButtonClass} !py-[7px]`}>Give up</button>
          <button onClick={submit} disabled={busy} className={`${modalSaveButtonClass} !py-[7px]`}>
            {busy ? (last ? `Grading ${fight.items.length}…` : 'Saving…') : !answer.trim() ? 'Skip (scores 0)' : last ? 'Finish & grade' : 'Next →'}
          </button>
        </div>
      </div>
      {confirmQuit && (
        <ConfirmDialog title="Give up this fight?" description="It won't count as won or lost, and the answers so far aren't graded." confirmLabel="Give up"
          onCancel={() => setConfirmQuit(false)}
          onConfirm={() => { setConfirmQuit(false); start(async () => { await abandonFightAction(fight.id); onAbandoned() }) }} />
      )}
    </Card>
  )
}

// ---------------- Result + Fix card ----------------

export function FightResult({ fight, label, onChange, onClose }: {
  fight: Fight
  label: string
  onChange: (f: Fight) => void
  onClose: () => void
}) {
  const [open, setOpen] = useState<number | null>(null)
  const [busy, start] = useTransition()
  const won = fight.status === 'won'
  const fix = fight.fix ?? []
  return (
    <Card title={`${won ? '🏆 Boss defeated' : '💀 Lost'} · ${label}`} action={<button onClick={onClose} aria-label="Close" className="text-fg-tertiary hover:text-fg-primary"><X size={15} /></button>}>
      <p className="text-[12.5px] text-fg-secondary tabular-nums">Average <span className={`font-bold ${won ? 'text-good' : 'text-risk'}`}>{fight.score ?? 0}/10</span> · needed {winAt(fight.gate).toFixed(1)}, none under {MIN_ANSWER} · {fight.date.slice(5)}</p>
      <ol className="flex flex-col gap-1 mt-2">
        {fight.items.map((it, i) => (
          <li key={it.question_id}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-baseline gap-2 text-left rounded-md hover:bg-surface-2 px-1 -mx-1 py-0.5">
              <span className={`text-[11px] font-bold tabular-nums rounded px-1.5 py-[1px] shrink-0 ${it.rating !== null && it.rating >= MIN_ANSWER ? (it.rating >= winAt(fight.gate) ? 'text-good bg-good-soft' : 'text-warn bg-warn-soft') : 'text-risk bg-risk-soft'}`}>{it.rating ?? '—'}</span>
              <span className="text-[12.5px] text-fg-primary truncate">{it.title}</span>
              {!it.answer && <span className="text-[11px] text-fg-tertiary shrink-0">skipped</span>}
            </button>
            {open === i && (
              <div className="mt-1 mb-2 space-y-2">
                {it.answer && <p className="text-[12px] text-fg-secondary whitespace-pre-wrap bg-surface-2 rounded-[8px] px-2.5 py-2 max-h-[240px] overflow-auto">{it.answer}</p>}
                {it.card ? <AnswerReview card={it.card} text="" rating={it.rating} question={it.title} />
                  : it.answer && <p className="text-[11.5px] text-fg-tertiary">No rating — the review failed or the AI budget ran out, so this answer counted as 0.</p>}
              </div>
            )}
          </li>
        ))}
      </ol>
      {!won && fix.length > 0 && (
        <div className="mt-3 rounded-[10px] border border-risk/40 bg-risk-soft px-3 py-2.5">
          <p className="text-[12.5px] font-bold text-fg-primary">Fix card — what the answers missed</p>
          <ul className="mt-1 flex flex-col gap-1">
            {fix.map((p, i) => (
              <li key={i} className="text-[12px] text-fg-secondary"><span className={p.status === 'missing' ? 'text-risk font-bold' : 'text-warn font-bold'}>{p.status === 'missing' ? '✗' : '◐'}</span> <span className="font-semibold text-fg-primary">{p.point}</span>{p.note ? ` — ${p.note}` : ''} <span className="text-fg-tertiary">({p.question})</span></li>
            ))}
          </ul>
          {fight.fix_read_at
            ? <p className="text-[11.5px] text-good font-semibold mt-2">✓ Read — rematch unlocked.</p>
            : <button disabled={busy} onClick={() => start(async () => { const f = await markFixReadAction(fight.id); if (f) onChange(f) })} className={`${modalSaveButtonClass} !py-[6px] mt-2`}>{busy ? 'Saving…' : 'I\'ve read this — unlock the rematch'}</button>}
        </div>
      )}
      {!won && fix.length === 0 && !fight.fix_read_at && (
        <button disabled={busy} onClick={() => start(async () => { const f = await markFixReadAction(fight.id); if (f) onChange(f) })} className={`${modalSaveButtonClass} !py-[6px] mt-3`}>Unlock the rematch</button>
      )}
    </Card>
  )
}

// ---------------- The ladder ----------------

const STATE: Record<Boss['state'], { icon: string; title: string }> = {
  defeated: { icon: '✅', title: 'Defeated' },
  rematch: { icon: '🔁', title: 'Rematch unlocked' },
  fix: { icon: '📖', title: 'Read the Fix card' },
  open: { icon: '⚔️', title: 'Not beaten yet' },
}
const scoreCls = (s: number | null, gate: number) => s === null ? 'text-fg-tertiary' : s >= gate ? 'text-good' : s >= gate - 15 ? 'text-warn' : 'text-risk'

export function LadderCard({ ladder, war, busy, onFight, onShowResult }: {
  ladder: Boss[]
  war: WarReadiness
  busy: boolean
  onFight: (area: ReadinessAreaKey) => void
  onShowResult: (f: Fight) => void
}) {
  const left = ladder.filter(b => b.state !== 'defeated').length
  return (
    <Card title="Boss Ladder" action={<span className="text-[11px] text-fg-tertiary tabular-nums">{left} left · {ladder.length - left} defeated</span>}>
      <ul className="flex flex-col gap-1.5">
        {ladder.map(b => (
          <li key={b.key}>
            <div className="flex items-center justify-between text-[12px] mb-[3px] gap-2">
              <button disabled={busy} onClick={() => b.state === 'fix' && b.lastFight ? onShowResult(b.lastFight) : onFight(b.key)} title={`${STATE[b.state].title} — ${b.state === 'fix' ? 'open the Fix card' : 'start a fight'}`}
                className="font-medium text-fg-primary truncate text-left hover:text-accent disabled:opacity-60">{STATE[b.state].icon} {b.label}</button>
              <span className="text-[11px] whitespace-nowrap inline-flex items-center gap-1.5">
                {b.lastFight && <button onClick={() => onShowResult(b.lastFight!)} className={`font-bold tabular-nums rounded px-1 ${resultCls(b.lastFight)}`}>{resultChip(b.lastFight)}</button>}
                <span><span className={`font-semibold tabular-nums ${scoreCls(b.score, b.gate)}`}>{b.score ?? '—'}</span><span className="text-fg-tertiary">/{b.gate}</span></span>
              </span>
            </div>
            <div className="relative h-[5px] rounded-[3px] bg-border">
              <div className={`h-full rounded-[3px] ${b.score === null ? '' : b.score >= b.gate ? 'bg-good' : b.score >= b.gate - 15 ? 'bg-warn' : 'bg-risk'}`} style={{ width: `${b.score ?? 0}%` }} />
              <span className="absolute -top-[2px] h-[9px] w-[2px] bg-fg-primary/70" style={{ left: `${b.gate}%` }} aria-hidden />
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between text-[12px] pt-1 border-t border-surface-3 mt-1">
          <span className="font-medium text-fg-primary">{(war.mockAvg ?? 0) >= 8 ? '🟢' : '🔴'} Mock average (last 5 reviewed)</span>
          <span className={`text-[11px] font-semibold tabular-nums ${scoreCls(war.mockAvg === null ? null : war.mockAvg * 10, 80)}`}>{war.mockAvg ?? '—'}<span className="text-fg-tertiary font-normal">/10 · gate 8</span></span>
        </li>
      </ul>
      <p className="text-[10.5px] text-fg-tertiary mt-2">Tap a boss to fight it. Defeated = a fight won in the last 7 days and the area at its gate (tick). Biggest gap first.</p>
    </Card>
  )
}
