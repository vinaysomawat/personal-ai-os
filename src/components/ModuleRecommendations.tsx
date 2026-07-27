'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getModuleRecommendations } from '@/features/ai/recommendations'
import type { Recommendation } from '@/features/ai/recommendations'

interface Props {
  moduleLabel: string
  context: string
  isOpen: boolean
}

// Content-only: rendered inside the shared AI advisor panel (see
// AIAdvisorProvider.tsx), which supplies the outer chrome (title, close
// button, slide-in). Fetches lazily on first open rather than on page load,
// same behavior as before this moved out of its own inline collapsible box.
export default function ModuleRecommendations({ moduleLabel, context, isOpen }: Props) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Recommendation[] | null>(null)

  useEffect(() => {
    if (isOpen && !items && !loading) {
      setLoading(true)
      getModuleRecommendations(moduleLabel, context, false).then(setItems).finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const regenerate = async () => {
    if (loading) return
    setLoading(true)
    try {
      setItems(await getModuleRecommendations(moduleLabel, context, true))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-fg-tertiary">Recommendations</p>
        {items && !loading && (
          <button onClick={regenerate} className="text-fg-tertiary hover:text-accent transition-colors" title="Regenerate">
            <RefreshCw size={12} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[90, 75, 85].map((w, i) => (
            <div key={i} className="h-3 rounded bg-surface-2 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((r, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{r.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm text-fg-secondary">{r.action}</p>
                <p className="text-xs text-accent mt-0.5">{r.impact}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-quaternary">No recommendations right now — try again in a moment.</p>
      )}
    </div>
  )
}
