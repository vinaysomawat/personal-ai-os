import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={0} rows={[{ heights: [110] }, { cols: 'lg:grid-cols-2', heights: [440, 440] }]} />
}
