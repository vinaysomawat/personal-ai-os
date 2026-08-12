import { ModuleLoading } from '@/components/Skeleton'

// One root-level loading.tsx instead of a copy per module route — Next.js
// falls back to the nearest ancestor's loading.tsx for any segment that
// doesn't define its own, and every module page sits directly under this
// root layout with nothing more specific in between. A generic 4-stat-tile
// shape covers every module close enough (most have 3 or 4 stat cards);
// exact per-module tuning isn't worth 8 separate files for a skeleton
// that's on screen for a few hundred ms.
export default function Loading() {
  return <ModuleLoading statsCols={4} />
}
