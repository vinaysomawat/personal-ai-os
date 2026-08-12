import React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} style={style} />
}

function CardSkeleton() {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  )
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-28 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          <Skeleton className="h-3 flex-1" style={{ width: `${60 + (i % 3) * 15}%` }} />
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  )
}

function StatsSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="bg-surface-1 border border-surface-3 rounded-xl p-4 flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

// Matches every page's own header shape (small date/subtitle line + big H1
// title) so the loading state doesn't skip straight to content.
function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-9 w-48" />
    </div>
  )
}

// One shared loading layout every module's loading.tsx composes instead of
// each hand-rolling its own near-identical stack of skeleton pieces —
// header, an optional stat row, a list, then N cards. Pass statsCols={null}
// to skip the stat row entirely (e.g. Settings, which has no stat tiles).
export function ModuleLoading({ statsCols = 3, listRows = 5, cards = 1 }: { statsCols?: number | null; listRows?: number; cards?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      <HeaderSkeleton />
      {statsCols !== null && <StatsSkeleton cols={statsCols} />}
      <ListSkeleton rows={listRows} />
      {Array.from({ length: cards }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}
