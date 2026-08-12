'use client'

import { useState } from 'react'
import { useEscapeKey } from '@/lib/use-escape-key'
import ScoreHero from '@/features/dashboard/components/ScoreHero'
import type { ScoreExplanationResult } from '../types'

export default function ScoreExplainer({ score, result }: { score: number; result: ScoreExplanationResult }) {
  const [open, setOpen] = useState(false)
  useEscapeKey(() => setOpen(false))

  // Highest-impact module surfaces first (design source's scoreBreakdown
  // sort), and the net change footer sums every module's delta — same math
  // as the Life Score's own day-over-day delta, just broken out by module.
  const rows = [...result.modules].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
  const netChange = result.modules.reduce((sum, m) => sum + (m.delta ?? 0), 0)

  return (
    <div className="relative w-full flex justify-center">
      <button onClick={() => setOpen(o => !o)} aria-label="Explain my Life Score" className="cursor-pointer">
        <ScoreHero score={score} />
      </button>

      {open && (
        <>
          {/* Invisible full-screen click-catcher to dismiss on outside click —
              not a visible backdrop; this renders as an inline dropdown
              attached to the ring, not a centered modal. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            onClick={e => e.stopPropagation()}
            className="absolute top-full left-[-10px] right-[-10px] mt-2 bg-surface-1 border border-surface-3 rounded-xl p-4 z-50 shadow-popover animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[13px] font-bold text-fg-primary">Explain My Score — vs. yesterday</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-fg-tertiary hover:text-fg-secondary text-[15px] leading-none">✕</button>
            </div>

            <ul>
              {rows.map((m, i) => {
                const delta = m.delta
                const color = delta === null || delta === 0 ? 'text-fg-tertiary' : delta > 0 ? 'text-green-400' : 'text-red-400'
                const arrow = delta === null ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '–'
                return (
                  <li key={m.module} className={`flex justify-between items-center gap-3 py-2 px-1.5 text-[12.5px] ${i === 0 ? 'bg-surface-2 rounded-lg' : 'border-t border-surface-3'}`}>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-fg-primary">{m.label}</span>
                      <span className="text-fg-tertiary text-[11px]">{m.tip}</span>
                    </div>
                    <span className={`shrink-0 font-bold whitespace-nowrap tabular-nums ${color}`}>
                      {arrow} {delta === null ? m.score : `${delta > 0 ? '+' : ''}${delta}`}
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="flex justify-between text-xs text-fg-tertiary pt-2.5 mt-1 border-t border-surface-3">
              <span>Net change</span>
              <span className={`font-bold tabular-nums ${netChange > 0 ? 'text-green-400' : netChange < 0 ? 'text-red-400' : 'text-fg-tertiary'}`}>
                {netChange > 0 ? '+' : ''}{netChange}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
