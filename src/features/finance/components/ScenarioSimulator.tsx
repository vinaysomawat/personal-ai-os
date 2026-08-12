'use client'

import { useState } from 'react'
import { computePurchaseScenario, type PurchaseScenarioResult } from '../scenario-simulation'
import { narratePurchaseScenario } from '@/features/ai/finance-advisor'
import type { FinanceProfile, FinancialGoal } from '../types'

interface ScenarioSimulatorProps {
  profile: FinanceProfile | null
  goals: FinancialGoal[]
  avgMonthlyExpense: number
}

export default function ScenarioSimulator({ profile, goals, avgMonthlyExpense }: ScenarioSimulatorProps) {
  const [what, setWhat] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [paidUpfront, setPaidUpfront] = useState('')
  const [emiAmount, setEmiAmount] = useState('')
  const [emiDurationMonths, setEmiDurationMonths] = useState('')
  const [result, setResult] = useState<PurchaseScenarioResult | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const financed = Math.max(0, Number(totalCost || 0) - Number(paidUpfront || 0))

  const canSimulate = Number(totalCost) > 0 && Number(emiAmount) > 0 && Number(emiDurationMonths) > 0 && !loading

  const handleSimulate = async () => {
    if (!canSimulate) return
    const input = {
      totalCost: Number(totalCost),
      paidUpfront: Number(paidUpfront || 0),
      emiAmount: Number(emiAmount),
      emiDurationMonths: Number(emiDurationMonths),
    }
    const computed = computePurchaseScenario(profile, avgMonthlyExpense, goals, input)
    setResult(computed)
    setNarrative(null)
    setLoading(true)
    try {
      const text = await narratePurchaseScenario(input, computed)
      setNarrative(text)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={what} onChange={e => setWhat(e.target.value)}
          placeholder="What (e.g. Car)"
          className="col-span-2 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
        />
        <label className="text-xs text-fg-tertiary">
          Total cost
          <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="₹"
            className="mt-1 w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
        </label>
        <label className="text-xs text-fg-tertiary">
          Paid upfront
          <input type="number" value={paidUpfront} onChange={e => setPaidUpfront(e.target.value)} placeholder="₹0"
            className="mt-1 w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
        </label>
        <label className="text-xs text-fg-tertiary">
          EMI amount
          <input type="number" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} placeholder="₹/month"
            className="mt-1 w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
        </label>
        <label className="text-xs text-fg-tertiary">
          EMI duration
          <input type="number" value={emiDurationMonths} onChange={e => setEmiDurationMonths(e.target.value)} placeholder="months"
            className="mt-1 w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-fg-primary placeholder-fg-quaternary outline-none focus:border-accent transition-colors" />
        </label>
      </div>
      {Number(totalCost) > 0 && <p className="text-xs text-fg-quaternary">Financed: ₹{financed.toLocaleString('en-IN')}</p>}

      <button onClick={handleSimulate} disabled={!canSimulate} className="w-full px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
        Simulate →
      </button>

      {result && (
        <div className="space-y-2 bg-surface-2 rounded-lg p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-fg-tertiary">Free cash / month</span>
            <span className="text-sm text-fg-secondary tabular-nums">₹{Math.round(result.freeCashBefore).toLocaleString('en-IN')} → <span className={result.goesNegative ? 'text-risk font-semibold' : 'text-fg-primary font-semibold'}>₹{Math.round(result.freeCashAfter).toLocaleString('en-IN')}</span></span>
          </div>
          {result.goesNegative && (
            <p className="text-xs text-risk">⚠️ This would put you in negative monthly cash flow.</p>
          )}
          {result.goalPaces.length > 0 && (
            <ul className="space-y-1 pt-1 border-t border-surface-3">
              {result.goalPaces.map(g => (
                <li key={g.name} className="text-xs text-fg-tertiary">
                  {g.name}: {g.remaining === 0 ? 'already funded' : g.monthsAtNewFreeCash === null ? 'unfundable at this new free cash level' : `~${g.monthsAtNewFreeCash} months if all new free cash went to it`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[90, 75, 80].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      )}
      {narrative && <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap border-l-2 border-accent/40 pl-3">{narrative}</p>}
    </div>
  )
}
