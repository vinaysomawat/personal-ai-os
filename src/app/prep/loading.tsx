import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={2} stats={4} tabs={3} rows={[{ cols: 'lg:grid-cols-2', heights: [360, 540] }]} />
}
