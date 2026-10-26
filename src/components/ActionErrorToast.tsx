'use client'

import { useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { ACTION_ERROR_EVENT } from '@/lib/guard'

// Shown when a guard()-ed server action fails (src/lib/guard.ts). Top-center,
// so it never sits on the mobile bottom bar or the QuickAdd button.
export function ActionErrorToast() {
  const [shownAt, setShownAt] = useState<number | null>(null)

  useEffect(() => {
    const show = () => setShownAt(Date.now())
    window.addEventListener(ACTION_ERROR_EVENT, show)
    return () => window.removeEventListener(ACTION_ERROR_EVENT, show)
  }, [])
  useEffect(() => {
    if (shownAt === null) return
    const t = setTimeout(() => setShownAt(null), 5000)
    return () => clearTimeout(t)
  }, [shownAt])

  if (shownAt === null) return null
  return (
    <div role="alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-max max-w-[calc(100%-24px)] flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg bg-surface-1 border border-risk-border shadow-popover text-[12.5px] text-fg-primary">
      <WifiOff size={14} className="text-risk shrink-0" />
      <span>Couldn&apos;t reach the server — nothing was saved. Try again.</span>
      <button onClick={() => setShownAt(null)} aria-label="Dismiss" className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-md text-fg-tertiary hover:text-fg-primary">
        <X size={14} />
      </button>
    </div>
  )
}
