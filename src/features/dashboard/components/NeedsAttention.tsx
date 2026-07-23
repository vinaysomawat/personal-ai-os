'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { Rocket } from 'lucide-react'
import Card from '@/components/Card'
import { dismissDecisionQueueItem } from '@/features/brain/executive-actions'
import { buildPriorityItems, KIND_HREF } from '../priority'
import type { Risk, Opportunity } from '@/features/brain/risk-opportunity-engine'
import type { TopAction } from '../actions'

const IMPACT_DOT: Record<Risk['impact'], string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-yellow-300' }
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
    <Card title="Needs Attention" padding="p-3.5">
      {items.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">Nothing urgent — you&apos;re on top of everything 🎉</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => {
            if (item.type === 'signal') {
              return (
                <li key={`signal-${i}`}>
                  <Link href={item.href} className="flex items-center gap-3 py-1 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors group">
                    <span className="text-lg shrink-0">{item.emoji}</span>
                    <p className="text-sm text-slate-300 flex-1">{item.text}</p>
                    <span className="text-xs text-slate-600 group-hover:text-accent transition-colors">→</span>
                  </Link>
                </li>
              )
            }
            if (item.type === 'risk') {
              return (
                <li key={item.kind} className="flex items-start gap-2 py-1 px-2 -mx-2">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${IMPACT_DOT[item.impact]}`} />
                  <Link href={KIND_HREF[item.kind]} className="flex-1 min-w-0 hover:text-accent transition-colors">
                    <p className="text-sm text-slate-300">{item.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">→ {item.action}</p>
                  </Link>
                  <button onClick={() => dismiss(item.kind)} aria-label="Dismiss" className="shrink-0 text-slate-600 hover:text-slate-400 text-xs px-1">✕</button>
                </li>
              )
            }
            return (
              <li key={item.kind} className="flex items-start gap-2 py-1 px-2 -mx-2">
                <Rocket size={13} className="text-accent shrink-0 mt-0.5" />
                <Link href={KIND_HREF[item.kind]} className="flex-1 text-sm text-slate-300 hover:text-accent transition-colors">{item.text}</Link>
                <button onClick={() => dismiss(item.kind)} aria-label="Dismiss" className="shrink-0 text-slate-600 hover:text-slate-400 text-xs px-1">✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
