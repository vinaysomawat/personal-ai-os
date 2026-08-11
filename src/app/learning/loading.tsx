import { StatsSkeleton, ListSkeleton, CardSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <StatsSkeleton cols={4} />
      <ListSkeleton rows={5} />
      <CardSkeleton />
    </div>
  )
}
