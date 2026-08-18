'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import { getEveningReflection } from '@/features/brain/executive-actions'
import type { EveningReflectionResult } from '@/features/ai/evening-reflection'

// Daily Operating System's "Evening Reflection" (Phase 5 PRD) — visible only
// after 6pm, same local-hour check the existing greeting bar already uses
// (this is a single-user, India-based app, so browser-local hours already
// serve as an IST proxy elsewhere in DashboardView.tsx). Fetches on mount
// only when the gate has passed, so it never blocks the initial page load.
export default function EveningReflection() {
  const [visible, setVisible] = useState(false)
  const [result, setResult] = useState<EveningReflectionResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 18) return
    setVisible(true)
    setLoading(true)
    let cancelled = false
    getEveningReflection().then(r => { if (!cancelled) { setResult(r); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (!visible) return null

  return (
    <Card title="🌙 Evening Reflection">
      {loading ? (
        <div className="space-y-2">
          {[90, 75, 85].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : (
        <>
          <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">{result?.reflection}</p>
          {result?.tomorrowsPriority && (
            <p className="flex gap-2 text-xs text-fg-secondary mt-3 pt-3 border-t border-surface-3">
              <span className="shrink-0">🎯</span>
              <span><span className="font-semibold text-fg-primary">Tomorrow&apos;s top priority:</span> {result.tomorrowsPriority}</span>
            </p>
          )}
        </>
      )}
    </Card>
  )
}
