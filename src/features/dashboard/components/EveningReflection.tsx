'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/Card'
import { getEveningReflection } from '@/features/brain/executive-actions'

// Daily Operating System's "Evening Reflection" (Phase 5 PRD) — visible only
// after 6pm, same local-hour check the existing greeting bar already uses
// (this is a single-user, India-based app, so browser-local hours already
// serve as an IST proxy elsewhere in DashboardView.tsx). Fetches on mount
// only when the gate has passed, so it never blocks the initial page load.
export default function EveningReflection() {
  const [visible, setVisible] = useState(false)
  const [reflection, setReflection] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 18) return
    setVisible(true)
    setLoading(true)
    let cancelled = false
    getEveningReflection().then(text => { if (!cancelled) { setReflection(text); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (!visible) return null

  return (
    <Card title="Evening Reflection" padding="p-3.5">
      {loading ? (
        <div className="space-y-2">
          {[90, 75, 85].map((w, i) => <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />)}
        </div>
      ) : (
        <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">{reflection}</p>
      )}
    </Card>
  )
}
