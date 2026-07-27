'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { Rocket } from 'lucide-react'
import Card from '@/components/Card'
import { dismissDecisionQueueItem } from '@/features/brain/executive-actions'
import { buildPriorityItems, KIND_HREF } from '../priority'
import { IMPACT_EMOJI, type Risk, type Opportunity } from '@/features/brain/risk-opportunity-engine'
import type { TopAction } from '../actions'

// Every row shares one layout (bg-surface-2, colored left border, kind
// badge under the text) regardless of type — risk/signal/opportunity used
// to each have their own bespoke row markup; this unifies them while
// keeping risk's per-severity color nuance (design's own mockup flattens
// risk to one flat red, but our impact tiers are real, worth keeping).
const IMPACT_BORDER: Record<Risk['impact'], string> = { high: 'border-red-400', medium: 'border-amber-400', low: 'border-yellow-300' }
const IMPACT_TEXT: Record<Risk['impact'], string> = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-yellow-300' }
const MAX_ITEMS = 3

interface NeedsAttentionProps {
  topActions: TopAction[]
  risks: Risk[]
  opportunities: Opportunity[]
}

// Daily Operating System's "Needs Attention" (Phase 5 PRD, capped at 3 —
// "anything more indicates prioritization failed"). Consolidates what used
// to be three separate things (Today's Focus signals, the Decision Queue's
// Risks, and its Opportunities) into one ranked list rather than showing
// the same class of information across multiple cards. Risks lead (real,
// time-sensitive problems) since they're more urgent than routine signals;
// Opportunities trail since they're the lowest-urgency of the three.
export default function NeedsAttention({ topActions, risks, opportunities }: NeedsAttentionProps) {
  const [, startTransition] = useTransition()
  const [queue, updateQueue] = useOptimistic(
    { risks, opportunities },
    (state, dismissedKind: string) => ({
      risks: state.risks.filter(r => r.kind !== dismissedKind),
      opportunities: state.opportunities.filter(o => o.kind !== dismissedKind),
    })
  )

  const dismiss = (kind: string) => {
    startTransition(async () => {
      updateQueue(kind)
      await dismissDecisionQueueItem(kind)
    })
  }

  const items = buildPriorityItems(queue.risks, topActions, queue.opportunities).slice(0, MAX_ITEMS)

  return (
    <Card title="Needs Attention" padding="p-3.5" action={<span className="text-xs text-fg-tertiary">capped at 3</span>}>
      {items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-fg-secondary">Nothing urgent — you&apos;re on top of everything 🎉</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => {
            if (item.type === 'signal') {
              return (
                <li key={`signal-${i}`} className="flex items-start gap-3 bg-surface-2 border-l-[3px] border-warn rounded-lg px-3 py-2.5">
                  <span className="text-lg shrink-0">{item.emoji}</span>
                  <Link href={item.href} className="flex-1 min-w-0 group">
                    <p className="text-sm text-fg-primary group-hover:text-accent transition-colors">{item.text}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-warn mt-0.5">Signal</p>
                  </Link>
                </li>
              )
            }
            if (item.type === 'risk') {
              return (
                <li key={item.kind} className={`flex items-start gap-3 bg-surface-2 border-l-[3px] rounded-lg px-3 py-2.5 ${IMPACT_BORDER[item.impact]}`}>
                  <span className="text-lg shrink-0">{IMPACT_EMOJI[item.impact]}</span>
                  <Link href={KIND_HREF[item.kind]} className="flex-1 min-w-0 group">
                    <p className="text-sm text-fg-primary group-hover:text-accent transition-colors">{item.text}</p>
                    <p className="text-xs text-fg-tertiary mt-0.5">→ {item.action}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${IMPACT_TEXT[item.impact]}`}>Risk</p>
                  </Link>
                  <button onClick={() => dismiss(item.kind)} aria-label="Dismiss" className="shrink-0 text-fg-quaternary hover:text-fg-secondary text-xs px-1">✕</button>
                </li>
              )
            }
            return (
              <li key={item.kind} className="flex items-start gap-3 bg-surface-2 border-l-[3px] border-good rounded-lg px-3 py-2.5">
                <Rocket size={17} className="text-good shrink-0" />
                <Link href={KIND_HREF[item.kind]} className="flex-1 min-w-0 group">
                  <p className="text-sm text-fg-primary group-hover:text-accent transition-colors">{item.text}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-good mt-0.5">Opportunity</p>
                </Link>
                <button onClick={() => dismiss(item.kind)} aria-label="Dismiss" className="shrink-0 text-fg-quaternary hover:text-fg-secondary text-xs px-1">✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
