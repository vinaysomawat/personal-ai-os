'use client'

import { useOptimistic, useTransition } from 'react'
import { Rocket, Target } from 'lucide-react'
import Card from '@/components/Card'
import { dismissDecisionQueueItem } from '@/features/brain/executive-actions'
import type { Risk, Opportunity } from '@/features/brain/risk-opportunity-engine'

const IMPACT_DOT: Record<Risk['impact'], string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-yellow-300' }

interface Goal { name: string; targetAmount: number; currentAmount: number; targetDate: string | null }

interface ExecutiveBriefProps {
  brief: string | null
  risks: Risk[]
  opportunities: Opportunity[]
  goals: Goal[]
}

export default function ExecutiveBrief({ brief, risks, opportunities, goals }: ExecutiveBriefProps) {
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

  const queueCount = queue.risks.length + queue.opportunities.length

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 uppercase tracking-widest">🧭 Executive Brief</p>

      <Card title="Morning Brief" padding="p-3.5">
        {brief ? (
          <p className="text-sm text-slate-300 leading-relaxed">{brief}</p>
        ) : (
          <p className="text-sm text-slate-500">Not generated yet — check back after this morning&apos;s briefing (~8:30am IST).</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card title="Decision Queue" padding="p-3.5" action={<span className="text-xs text-slate-500">{queueCount}</span>}>
          {queueCount === 0 ? (
            <p className="text-sm text-slate-400">Nothing needs your attention right now 🎉</p>
          ) : (
            <ul className="space-y-2">
              {queue.risks.map(r => (
                <li key={r.kind} className="flex items-start gap-2 pb-2 border-b border-surface-3 last:border-0 last:pb-0">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${IMPACT_DOT[r.impact]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300">{r.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">→ {r.action}</p>
                  </div>
                  <button onClick={() => dismiss(r.kind)} aria-label="Dismiss" className="shrink-0 text-slate-600 hover:text-slate-400 text-xs px-1">✕</button>
                </li>
              ))}
              {queue.opportunities.map(o => (
                <li key={o.kind} className="flex items-start gap-2 pb-2 border-b border-surface-3 last:border-0 last:pb-0">
                  <Rocket size={13} className="text-accent shrink-0 mt-0.5" />
                  <p className="flex-1 text-sm text-slate-300">{o.text}</p>
                  <button onClick={() => dismiss(o.kind)} aria-label="Dismiss" className="shrink-0 text-slate-600 hover:text-slate-400 text-xs px-1">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Goal Progress" padding="p-3.5" action={<Target size={13} className="text-accent" />}>
          {goals.length === 0 ? (
            <p className="text-sm text-slate-400">No financial goals set yet — add one in Finance</p>
          ) : (
            <ul className="space-y-2.5">
              {goals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0
                return (
                  <li key={g.name}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-slate-300">{g.name}</span>
                      <span className="text-xs text-slate-500 tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">₹{Math.round(g.currentAmount).toLocaleString('en-IN')} of ₹{Math.round(g.targetAmount).toLocaleString('en-IN')}{g.targetDate ? ` · by ${g.targetDate}` : ''}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
