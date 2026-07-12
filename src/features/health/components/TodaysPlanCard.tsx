'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { getDailyHealthPlan } from '@/features/ai/health-report'
import type { HealthMetric, HealthProfile } from '../types'
import type { DailyTargets, HealthScoreBreakdown } from '../calculations'

interface Props {
  profile: HealthProfile
  plan: DailyTargets
  todayMetric: HealthMetric | null
  score: HealthScoreBreakdown
  today: string
}

export default function TodaysPlanCard({ profile, plan, todayMetric, score, today }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (loading) return
    if (open && text) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const result = await getDailyHealthPlan(profile, plan, todayMetric, score, today)
      setText(result)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-accent/30 rounded-xl overflow-hidden bg-gradient-to-br from-accent/5 to-transparent">
      <button onClick={handleGenerate} className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span className="text-sm font-medium text-slate-200">Today&apos;s AI Plan</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-xs text-slate-500">Thinking...</span>}
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-surface-3/50">
          {loading ? (
            <div className="space-y-2">
              {[90, 75, 85, 60, 70].map((w, i) => (
                <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : text ? (
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
