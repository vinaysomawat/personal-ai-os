import { ListSkeleton, CardSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse">
      <ListSkeleton rows={5} />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}
