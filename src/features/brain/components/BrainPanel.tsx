'use client'

import { useState } from 'react'
import BrainChat from './BrainChat'
import DecisionHelper from './DecisionHelper'
import WeeklyReview from './WeeklyReview'
import MonthlyReview from './MonthlyReview'
import type { BrainContext } from '../types'
import { logAdvisorUsage } from '@/lib/advisor-usage'

const TABS = [
  { key: 'chat', label: 'Ask' },
  { key: 'decision', label: 'Decide' },
  { key: 'reflect', label: 'Reflect' },
  { key: 'monthly', label: 'Monthly' },
] as const

export default function BrainPanel({ context }: { context: BrainContext }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('chat')

  return (
    <div>
      <div className="flex gap-1 mb-3 bg-surface-2 rounded-lg p-0.5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); logAdvisorUsage('Ask Brain', t.key) }} className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${tab === t.key ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg-secondary'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'chat' && <BrainChat context={context} />}
      {tab === 'decision' && <DecisionHelper context={context} />}
      {tab === 'reflect' && <WeeklyReview />}
      {tab === 'monthly' && <MonthlyReview context={context} />}
    </div>
  )
}
