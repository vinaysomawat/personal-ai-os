import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={0} banner rows={[{ cols: 'lg:grid-cols-[340px_1fr]', heights: [300, 96] }, { cols: 'lg:grid-cols-2', heights: [190, 230] }, { cols: 'lg:grid-cols-2', heights: [270, 120] }, { cols: 'lg:grid-cols-2', heights: [250, 250] }]} />
}
