import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={2} banner stats={4} tabs={4} rows={[{ cols: 'lg:grid-cols-2', heights: [560, 560] }]} />
}
