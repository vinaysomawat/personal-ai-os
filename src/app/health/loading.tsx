import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={2} stats={4} rows={[{ cols: 'lg:grid-cols-2', heights: [230, 230] }, { cols: 'lg:grid-cols-2', heights: [220, 120] }, { cols: 'lg:grid-cols-2', heights: [300, 300] }]} />
}
