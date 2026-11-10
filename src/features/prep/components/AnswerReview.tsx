'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircleQuestion, Sparkles } from 'lucide-react'
import MicButton, { appendText } from '@/components/MicButton'
import { modalSaveButtonClass } from '@/components/Modal'
import { useAIStream } from '@/lib/use-ai-stream'
import type { AIStreamRequest } from '@/features/ai/stream-request'
import { CRITERIA, type PartialReview, type PointStatus, type ReviewEvent, type Rubric, type Scorecard } from '../scorecard'

const rateCls = (r: number) => r >= 8 ? 'text-good bg-good-soft' : r >= 6 ? 'text-warn bg-warn-soft' : 'text-risk bg-risk-soft'
const VERDICT_CLS: Record<Scorecard['verdict'], string> = { Strong: 'text-good', Good: 'text-warn', 'Needs work': 'text-risk' }
const POINT: Record<PointStatus, { mark: string; cls: string }> = {
  covered: { mark: '✓', cls: 'text-good' },
  partial: { mark: '◐', cls: 'text-warn' },
  missing: { mark: '✗', cls: 'text-risk' },
}
const scoreCls = (v: number, max: number) => v === max ? 'text-good' : v === 0 ? 'text-risk' : 'text-warn'

// A diff or code body (code-review questions): monospace, scrolls inside its
// own box, +/- lines tinted. No syntax-highlighting dependency.
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-2.5 max-h-[420px] overflow-auto rounded-[8px] border border-border bg-surface-2 py-2 text-[11.5px] leading-[1.45] font-mono">
      {code.split('\n').map((line, i) => (
        <div key={i} className={`px-2.5 whitespace-pre ${line.startsWith('+') && !line.startsWith('+++') ? 'bg-good-soft' : line.startsWith('-') && !line.startsWith('---') ? 'bg-risk-soft' : line.startsWith('@@') ? 'text-accent' : 'text-fg-primary'}`}>{line || ' '}</div>
      ))}
    </pre>
  )
}

// ```fenced``` → code block; `code` → monospace chip; *emphasis* dropped.
// A fence still open (a reply being streamed) runs to the end of the text.
export function Rich({ text }: { text: string }) {
  if (text.includes('```')) {
    return (
      <>
        {text.split(/```[a-z]*\n?([\s\S]*?)(?:```|$)/).map((part, i) => i % 2
          ? <pre key={i} className="my-1.5 font-mono text-[11.5px] leading-snug bg-surface-1 border border-border rounded-[6px] px-2 py-1.5 overflow-x-auto whitespace-pre">{part.replace(/\n$/, '')}</pre>
          : <Rich key={i} text={part.replace(/^\n+|\n+$/g, '')} />)}
      </>
    )
  }
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) => part.startsWith('`') && part.endsWith('`') && part.length > 2
        ? <code key={i} className="font-mono text-[11.5px] bg-surface-1 border border-border text-fg-primary rounded-[4px] px-1 py-[0.5px] break-words">{part.slice(1, -1)}</code>
        : <Fragment key={i}>{part.replace(/\*\*?([^*]+)\*\*?/g, '$1')}</Fragment>)}
    </>
  )
}

// Question Bank AI review: computed rating + verdict, the criterion
// breakdown, a key-point checklist (covered / partial / missing), numbered
// fixes, the follow-up as a callout. No scorecard (budget fallback, errors)
// → the text as-is. With `question`, the follow-up can be answered and
// reviewed in place (practice only, nothing stored).
export default function AnswerReview({ card, text, rating, stale, question }: { card: Scorecard | null; text: string; rating: number | null; stale?: boolean; question?: string }) {
  const k = card ? CRITERIA[card.rubric] : null
  const covered = card ? card.points.filter(p => p.status === 'covered').length : 0
  return (
    <div className={`mt-3 rounded-[10px] border border-accent/30 bg-accent-soft px-3 py-2.5 ${stale ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        {rating !== null && <span className={`text-[15px] font-bold tabular-nums rounded-[6px] px-2 py-[1px] shrink-0 ${rateCls(rating)}`}>{rating}/10</span>}
        <div className="min-w-0 pt-[2px]">
          <p className="text-[13px] text-fg-primary leading-snug">
            <Sparkles size={12} className="inline -mt-0.5 mr-1 text-accent" />
            {card ? <><span className={`font-semibold ${VERDICT_CLS[card.verdict]}`}>{card.verdict} · </span><Rich text={card.summary} /></> : <span className="whitespace-pre-wrap text-fg-secondary">{text}</span>}
            {stale && <span className="text-[11px] text-fg-tertiary"> · answer edited since</span>}
          </p>
          {card && k && (
            <p className="text-[11px] text-fg-tertiary tabular-nums mt-0.5 flex flex-wrap gap-x-2.5">
              <span>Key points <span className={`font-semibold ${scoreCls(covered, card.points.length)}`}>{covered}/{card.points.length}</span></span>
              <span>{k.correctness} <span className={`font-semibold ${scoreCls(card.correctness, 2)}`}>{card.correctness}/2</span></span>
              <span>{k.depth} <span className={`font-semibold ${scoreCls(card.depth, 2)}`}>{card.depth}/2</span></span>
              <span>{k.clarity} <span className={`font-semibold ${scoreCls(card.clarity, 1)}`}>{card.clarity}/1</span></span>
            </p>
          )}
        </div>
      </div>
      {card && (
        <>
          <PointsAndFixes points={card.points} fixes={card.fixes} />
          {card.followUp && (
            <div className="mt-2.5 rounded-[8px] bg-surface-1 border border-border px-2.5 py-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-accent inline-flex items-center gap-1"><MessageCircleQuestion size={11} /> Follow-up they&apos;d ask</p>
              <p className="text-[12.5px] text-fg-primary leading-snug mt-0.5"><Rich text={card.followUp} /></p>
              {question && <FollowUpAnswer key={card.followUp} rubric={card.rubric} question={question} followUp={card.followUp} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PointsAndFixes({ points, fixes }: Pick<Scorecard, 'points' | 'fixes'>) {
  return (
    <>
      {points.length > 0 && (
        <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12.5px] leading-snug min-w-0">
              <span className={`font-bold shrink-0 w-[12px] text-center ${POINT[p.status].cls}`} aria-label={p.status}>{POINT[p.status].mark}</span>
              <span className="min-w-0">
                <span className={p.status === 'covered' ? 'text-fg-primary' : 'text-fg-primary font-medium'}><Rich text={p.point} /></span>
                {p.note && <span className="text-fg-tertiary"> — <Rich text={p.note} /></span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {fixes.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-warn">Fix next</p>
          <ol className="text-[12.5px] text-fg-secondary leading-snug mt-1 flex flex-col gap-1 pl-4 list-decimal marker:text-fg-tertiary">
            {fixes.map((x, i) => <li key={i}><Rich text={x} /></li>)}
          </ol>
        </div>
      )}
    </>
  )
}

const parseEvent = (line: string): ReviewEvent | null => {
  try { return JSON.parse(line) } catch { return null }
}

export type ReviewFinal = Extract<ReviewEvent, { final: unknown }>['final']

// A review being written: the card fills in as each part finishes, and the
// rating comes with onDone (null if it failed). Its own component so the
// screen around it doesn't re-render as text arrives. Keep it mounted until
// onDone: unmounting ends the read, and counts as failed.
export function ReviewStream({ request, onDone }: { request: AIStreamRequest; onDone: (result: ReviewFinal | null) => void }) {
  const { text, start } = useAIStream()
  const latestRun = useRef(0)

  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone })
  const run = useCallback(async () => {
    const thisRun = ++latestRun.current
    const { text: full } = await start(request)
    if (thisRun !== latestRun.current) return
    const event = parseEvent(full.trimEnd().split('\n').at(-1) ?? '')
    onDoneRef.current(event && 'final' in event ? event.final : null)
  }, [start, request])
  useEffect(() => { run() }, [run])

  const partial = useMemo<PartialReview | null>(() => {
    // The newest finished partial; the last lines may be unfinished or the final.
    const lines = text.split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      const event = parseEvent(lines[i])
      if (event && 'partial' in event) return event.partial
    }
    return null
  }, [text])

  return (
    <div role="status" className="mt-3 rounded-[10px] border border-accent/30 bg-accent-soft px-3 py-2.5">
      <p className="text-[12px] text-fg-secondary inline-flex items-center gap-1.5">
        <Sparkles size={12} className="text-accent animate-pulse" />
        {partial ? 'Reviewing… the rating comes last' : 'Reading your answer…'}
      </p>
      {partial && (
        <>
          {partial.summary && <p className="text-[13px] text-fg-primary leading-snug mt-1.5"><Rich text={partial.summary} /></p>}
          <PointsAndFixes points={partial.points} fixes={partial.fixes} />
          {partial.followUp && (
            <div className="mt-2.5 rounded-[8px] bg-surface-1 border border-border px-2.5 py-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-accent inline-flex items-center gap-1"><MessageCircleQuestion size={11} /> Follow-up they&apos;d ask</p>
              <p className="text-[12.5px] text-fg-primary leading-snug mt-0.5"><Rich text={partial.followUp} /></p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Answer the follow-up yourself and get it graded with the same scorecard.
function FollowUpAnswer({ rubric, question, followUp }: { rubric: Rubric; question: string; followUp: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [spoken, setSpoken] = useState(false)
  const [result, setResult] = useState<{ answer: string; text: string; rating: number | null; card: Scorecard | null } | null>(null)
  const [request, setRequest] = useState<Extract<AIStreamRequest, { feature: 'review_followup' }> | null>(null)
  const busy = !!request
  const ready = text.trim().length >= 40
  const review = () => {
    if (!ready || busy) return
    setRequest({ feature: 'review_followup', rubric, original: question, followUp, answer: text.trim(), spoken })
  }
  if (!open) return <button onClick={() => setOpen(true)} className="mt-1.5 text-[11.5px] font-semibold text-accent hover:underline">Answer follow-up →</button>
  return (
    <div className="mt-2">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus placeholder="Answer it as you would in the room — out loud first, then here."
        className="w-full bg-surface-2 border border-surface-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px] text-fg-primary outline-none focus:border-accent resize-y" />
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span className="inline-flex items-center gap-2 min-w-0">
          <MicButton onText={t => { setText(prev => appendText(prev, t)); setSpoken(true) }} />
          <span className="text-[11px] text-fg-tertiary tabular-nums shrink-0">{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        </span>
        <button onClick={review} disabled={busy || !ready} title={ready ? undefined : 'Type at least a few sentences first'}
          className={`${modalSaveButtonClass} inline-flex items-center gap-1.5 !py-[5px] !text-[12px] disabled:opacity-50`}>
          <Sparkles size={12} /> {busy ? 'Reviewing…' : result ? 'Re-review' : 'Review'}
        </button>
      </div>
      {request && <ReviewStream request={request} onDone={r => {
        setResult({ answer: request.answer, text: r?.feedback ?? 'Review failed: the connection or server had a problem. Try again.', rating: r?.rating ?? null, card: r?.card ?? null })
        setRequest(null)
      }} />}
      {result && !busy && <AnswerReview card={result.card} text={result.text} rating={result.rating} stale={result.answer !== text.trim()} />}
    </div>
  )
}
