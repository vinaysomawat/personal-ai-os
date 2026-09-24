'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <AlertCircle size={32} className="text-red-400 opacity-60" />
      <div className="text-center max-w-sm">
        <p className="text-sm font-medium text-fg-secondary">Something went wrong</p>
        <p className="text-xs text-fg-quaternary mt-1">This page hit an unexpected error. Try again — if it keeps happening, check the browser console for details.</p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-surface-2 border border-surface-3 text-sm text-fg-secondary hover:bg-surface-3 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
