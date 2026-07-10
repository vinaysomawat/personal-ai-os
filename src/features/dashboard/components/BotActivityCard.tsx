'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Card from '@/components/Card'

const MODULE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  planner:   { label: 'Planner',   emoji: '📋', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  career:    { label: 'Career',    emoji: '💼', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  finance:   { label: 'Finance',   emoji: '💸', color: 'text-green-400',  bg: 'bg-green-500/10' },
  health:    { label: 'Health',    emoji: '💪', color: 'text-red-400',    bg: 'bg-red-500/10' },
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
    <Card title="Bot Activity" action={
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {aiBudget && (
          <span title={`${aiBudget.callsMonth} AI calls this month · ${aiBudget.cacheHitRateMonth}% served from cache`}>
            💰 ${formatUsd(aiBudget.costTodayUsd)} today · ${formatUsd(aiBudget.costMonthUsd)} this month
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <Bot size={12} /><span>Telegram</span>
        </div>
      </div>
    }>
      {!botActivity || botActivity.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <Bot size={24} className="mx-auto text-slate-700" />
          <p className="text-sm text-slate-600">No bot activity yet</p>
          <p className="text-xs text-slate-700">Send a message to any Telegram bot and it will appear here</p>
        </div>
      ) : (
        <>
          <ul className="space-y-px">
            {shown.map((entry, i) => {
              const meta = MODULE_META[entry.module] ?? { label: entry.module, emoji: '🤖', color: 'text-slate-400', bg: 'bg-slate-500/10' }
              const firstLine = entry.response?.split('\n')[0]?.replace(/\*/g, '') ?? ''
              const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
              return (
                <li key={i} className="flex items-start gap-3 py-2.5 border-b border-surface-3 last:border-0">
                  <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5 text-sm`}>
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-slate-700">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">&ldquo;{entry.message}&rdquo;</p>
                    {firstLine && <p className="text-xs text-slate-500 mt-0.5 truncate">{firstLine}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
          {visible < botActivity.length && (
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="w-full mt-2 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-surface-2 transition-colors"
            >
              Load more ({botActivity.length - visible} more)
            </button>
          )}
        </>
      )}
    </Card>
  )
}
