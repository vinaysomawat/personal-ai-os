'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Card from '@/components/Card'

const MODULE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  planner:   { label: 'Planner',   emoji: '📋', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  career:    { label: 'Career',    emoji: '💼', color: 'text-amber-400',  bg: 'bg-warn-soft' },
  finance:   { label: 'Finance',   emoji: '💸', color: 'text-green-400',  bg: 'bg-good-soft' },
  health:    { label: 'Health',    emoji: '💪', color: 'text-red-400',    bg: 'bg-risk-soft' },
  learning:  { label: 'Learning',  emoji: '📚', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  coding:    { label: 'Coding',    emoji: '💻', color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  documents: { label: 'Documents', emoji: '📄', color: 'text-orange-400', bg: 'bg-orange-500/10' },
}

const PAGE_SIZE = 10

interface BotActivityEntry {
  module: string
  message: string
  response: string | null
  created_at: string
}

function formatUsd(n: number): string {
  if (n === 0) return '0.00'
  if (n < 0.01) return n.toFixed(4)
  return n.toFixed(2)
}

export default function BotActivityCard({ botActivity, aiBudget }: {
  botActivity: BotActivityEntry[]
  aiBudget: { callsMonth: number; cacheHitRateMonth: number; costTodayUsd: number; costMonthUsd: number } | null
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)
  const shown = botActivity.slice(0, visible)

  return (
    <Card title="Recent bot activity" className="mb-5" action={
      <div className="flex items-center gap-3 text-xs text-fg-tertiary">
        {aiBudget && (
          <span title={`${aiBudget.callsMonth} AI calls this month`}>
            Today: ${formatUsd(aiBudget.costTodayUsd)} · This month: ${formatUsd(aiBudget.costMonthUsd)} · cache hit rate {aiBudget.cacheHitRateMonth}%
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <Bot size={12} /><span>Telegram</span>
        </div>
      </div>
    }>
      {!botActivity || botActivity.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Bot size={24} className="mx-auto text-fg-quaternary" />
          <p className="text-sm text-fg-quaternary">No bot activity yet</p>
          <p className="text-xs text-fg-quaternary">Send a message to any Telegram bot and it will appear here</p>
        </div>
      ) : (
        <>
          <ul>
            {shown.map((entry, i) => {
              const meta = MODULE_META[entry.module] ?? { label: entry.module, emoji: '🤖', color: 'text-fg-secondary', bg: 'bg-surface-2' }
              const firstLine = entry.response?.split('\n')[0]?.replace(/\*/g, '') ?? ''
              const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
              return (
                <li key={i} className="flex items-baseline gap-2.5 py-[9px] border-t border-surface-3 first:border-t-0 text-[12.5px] hover:bg-surface-2 transition-colors">
                  <span className="shrink-0 w-5">{meta.emoji}</span>
                  <span className={`shrink-0 w-[78px] truncate font-medium ${meta.color}`}>{meta.label}</span>
                  <span className="flex-1 min-w-0 truncate text-fg-secondary">{entry.message}</span>
                  {firstLine && <span className="flex-1 min-w-0 truncate text-fg-quaternary hidden md:block">{firstLine}</span>}
                  <span className="shrink-0 text-border-strong">{timeAgo}</span>
                </li>
              )
            })}
          </ul>
          {visible < botActivity.length && (
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="w-full mt-2 py-2 rounded-lg text-xs font-medium text-fg-tertiary hover:text-fg-secondary hover:bg-surface-2 transition-colors"
            >
              Load more ({botActivity.length - visible} more)
            </button>
          )}
        </>
      )}
    </Card>
  )
}
