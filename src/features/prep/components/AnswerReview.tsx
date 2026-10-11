import { Fragment } from 'react'
import { MessageCircleQuestion, Sparkles } from 'lucide-react'
import { CRITERIA, type PointStatus, type Scorecard } from '../scorecard'

const rateCls = (r: number) => r >= 8 ? 'text-good bg-good-soft' : r >= 6 ? 'text-warn bg-warn-soft' : 'text-risk bg-risk-soft'
const VERDICT_CLS: Record<Scorecard['verdict'], string> = { Strong: 'text-good', Good: 'text-warn', 'Needs work': 'text-risk' }
const POINT: Record<PointStatus, { mark: string; cls: string }> = {
  covered: { mark: '✓', cls: 'text-good' },
  partial: { mark: '◐', cls: 'text-warn' },
  missing: { mark: '✗', cls: 'text-risk' },
}
const scoreCls = (v: number, max: number) => v === max ? 'text-good' : v === 0 ? 'text-risk' : 'text-warn'

// `code` → monospace chip; *emphasis* markers dropped.
function Rich({ text }: { text: string }) {
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
// → the text as-is.
export default function AnswerReview({ card, text, rating, stale }: { card: Scorecard | null; text: string; rating: number | null; stale?: boolean }) {
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
          <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {card.points.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12.5px] leading-snug min-w-0">
                <span className={`font-bold shrink-0 w-[12px] text-center ${POINT[p.status].cls}`} aria-label={p.status}>{POINT[p.status].mark}</span>
                <span className="min-w-0">
                  <span className={p.status === 'covered' ? 'text-fg-primary' : 'text-fg-primary font-medium'}><Rich text={p.point} /></span>
                  {p.note && <span className="text-fg-tertiary"> — <Rich text={p.note} /></span>}
                </span>
              </li>
            ))}
          </ul>
          {card.fixes.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-warn">Fix next</p>
              <ol className="text-[12.5px] text-fg-secondary leading-snug mt-1 flex flex-col gap-1 pl-4 list-decimal marker:text-fg-tertiary">
                {card.fixes.map((x, i) => <li key={i}><Rich text={x} /></li>)}
              </ol>
            </div>
          )}
          {card.followUp && (
            <div className="mt-2.5 rounded-[8px] bg-surface-1 border border-border px-2.5 py-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.4px] text-accent inline-flex items-center gap-1"><MessageCircleQuestion size={11} /> Follow-up they&apos;d ask</p>
              <p className="text-[12.5px] text-fg-primary leading-snug mt-0.5"><Rich text={card.followUp} /></p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
