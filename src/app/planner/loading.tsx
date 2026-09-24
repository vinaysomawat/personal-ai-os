import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={1} stats={4} rows={[{ cols: 'lg:grid-cols-[1.35fr_1fr]', heights: [560, 300] }]} />
}
