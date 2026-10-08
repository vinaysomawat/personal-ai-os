import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={1} tabs={3} rows={[{ heights: [260] }, { heights: [340] }]} />
}
