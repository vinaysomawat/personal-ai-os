'use client'

import dynamic from 'next/dynamic'

// `ssr: false` requires a Client Component boundary — this wrapper exists
// solely so DashboardView (a Server Component) can code-split recharts
// (~100KB, used nowhere else in the app) out of the initial bundle.
const LifeScoreTrend = dynamic(() => import('./LifeScoreTrend'), {
  ssr: false,
  loading: () => <div className="h-[13.5rem] bg-surface-1 border border-surface-3 rounded-xl animate-pulse" />,
})

export default LifeScoreTrend
