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

// Per-page loading layout (UI v2.2a, 2026-09-24) — each route's
// loading.tsx describes its real grid (stat tiles, tabs, card rows with
// approximate heights) so content lands where the skeleton was instead of
// jumping from one generic shape. Tiles/cards reuse the real card chrome.
interface SkeletonRow { cols?: string; heights: number[] }

export function PageSkeleton({ chips = 1, banner = false, stats, statsCols, tabs, rows }: {
  chips?: number; banner?: boolean; stats?: number; statsCols?: string; tabs?: number; rows: SkeletonRow[]
}) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-40" />
        {Array.from({ length: chips }).map((_, i) => <Skeleton key={i} className="h-6 w-28 rounded-full" />)}
      </div>
      {banner && <Skeleton className="h-10 w-full rounded-xl" />}
      {stats && (
        <div className={`grid gap-[var(--grid-gap-sm)] ${statsCols ?? 'grid-cols-2 sm:grid-cols-4'}`}>
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-sm)] space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      )}
      {tabs && (
        <div className="flex gap-4 border-b border-surface-3 pb-2">
          {Array.from({ length: tabs }).map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
        </div>
      )}
      {rows.map((row, r) => (
        <div key={r} className={`grid grid-cols-1 gap-[var(--grid-gap)] items-start ${row.cols ?? ''}`}>
          {row.heights.map((h, i) => (
            <div key={i} className="bg-surface-1 border border-surface-3 rounded-[18px] p-[var(--card-pad-lg)] space-y-3 overflow-hidden" style={{ height: h }}>
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: Math.max(1, Math.floor((h - 60) / 34)) }).map((_, j) => (
                <Skeleton key={j} className="h-3" style={{ width: `${55 + ((i + j) % 3) * 15}%` }} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
