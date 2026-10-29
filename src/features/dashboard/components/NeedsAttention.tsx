'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import Card from '@/components/Card'
import { dismissDecisionQueueItem } from '@/features/brain/executive-actions'
import { buildPriorityItems, KIND_HREF } from '../priority'
import type { Risk } from '@/features/brain/risk-opportunity-engine'
import type { TopAction } from '../actions'
import { guard } from '@/lib/guard'

// "Your turn" (the life app's action list): one card per item, a coloured
// left border for urgency, the item in bold, a "→ action" line for risks,
// a grey module chip, and a right-aligned uppercase tag. Risks keep their
// per-impact colour; signals use the accent. Signal rows get no action line
// (each signal generator writes one blended sentence already).
const IMPACT_BORDER: Record<Risk['impact'], string> = { high: 'border-l-risk', medium: 'border-l-warn', low: 'border-l-warn' }
const IMPACT_TEXT: Record<Risk['impact'], string> = { high: 'text-risk', medium: 'text-warn', low: 'text-warn' }
const MAX_ITEMS = 3
const moduleOf = (href: string) => href.split(/[/?#]/)[1] || 'app'
const chip = 'text-[10.5px] font-medium rounded-[4px] px-1.5 py-[1px] bg-surface-2 text-fg-tertiary'

interface NeedsAttentionProps {
  topActions: TopAction[]
  risks: Risk[]
}

// Daily Operating System's "Needs Attention" (Phase 5 PRD, capped at 3 —
// "anything more indicates prioritization failed"). Today's Focus signals
// and the Risk engine's risks in one ranked list. Risks lead (real,
// time-sensitive problems) since they're more urgent than routine signals.
export default function NeedsAttention({ topActions, risks }: NeedsAttentionProps) {
  const [, startTransition] = useTransition()
  const [queue, updateQueue] = useOptimistic(
    { risks },
    (state, dismissedKind: string) => ({
      risks: state.risks.filter(r => r.kind !== dismissedKind),
    })
  )

  const dismiss = (kind: string) => {
    startTransition(guard(async () => {
      updateQueue(kind)
      await dismissDecisionQueueItem(kind)
    }))
  }

  const all = buildPriorityItems(queue.risks, topActions)
  const items = all.slice(0, MAX_ITEMS)
  const row = 'flex items-start gap-2 rounded-[8px] border border-surface-3 border-l-[3px] bg-surface-1 px-2.5 py-2'

  return (
    <Card title={`Your turn · ${all.length}`} action={all.length > MAX_ITEMS ? <span className="text-[11px] text-fg-tertiary">top {MAX_ITEMS}</span> : undefined}>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-fg-tertiary py-2">✅ All clear — nothing needs you today.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, i) => {
            if (item.type === 'signal') {
              return (
                <li key={`signal-${i}`} className={`${row} border-l-accent`}>
                  <Link href={item.href} className="flex-1 min-w-0 group">
                    <p className="text-[13px] font-semibold leading-snug text-fg-primary group-hover:text-accent transition-colors">{item.text}</p>
                    <p className="mt-1"><span className={chip}>{moduleOf(item.href)}</span></p>
                  </Link>
                  <span className="text-[10px] font-bold uppercase tracking-[0.4px] text-accent shrink-0 mt-0.5">For you</span>
                </li>
              )
            }
            return (
              <li key={item.kind} className={`${row} ${IMPACT_BORDER[item.impact]}`}>
                <Link href={KIND_HREF[item.kind]} className="flex-1 min-w-0 group">
                  <p className="text-[13px] font-semibold leading-snug text-fg-primary group-hover:text-accent transition-colors">{item.text}</p>
                  <p className="text-[12px] text-fg-secondary mt-0.5">→ {item.action}</p>
                  <p className="mt-1"><span className={chip}>{moduleOf(KIND_HREF[item.kind])}</span> <span className={chip}>{item.impact} impact</span></p>
                </Link>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.4px] mt-0.5 ${IMPACT_TEXT[item.impact]}`}>Act</span>
                  <button onClick={() => dismiss(item.kind)} aria-label="Dismiss" className="text-fg-quaternary hover:text-fg-secondary text-[11px] px-0.5">✕</button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
