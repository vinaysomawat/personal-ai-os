import { PageSkeleton } from '@/components/Skeleton'

// Shaped like this page's real layout — see PageSkeleton.
export default function Loading() {
  return <PageSkeleton chips={1} stats={3} statsCols="grid-cols-3" rows={[{ heights: [260] }, { cols: 'lg:grid-cols-[3fr_2fr]', heights: [480, 320] }]} />
}
