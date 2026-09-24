import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={2} stats={4} rows={[{ heights: [240] }, { cols: 'sm:grid-cols-2 lg:grid-cols-4', heights: [210, 210, 210, 210] }, { cols: 'lg:grid-cols-2', heights: [400, 300] }]} />
}
