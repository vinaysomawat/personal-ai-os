'use client'

import dynamic from 'next/dynamic'

// Same code-splitting rationale as Dashboard's LifeScoreTrendLazy — recharts
// is ~100KB and Finance didn't previously pull it in at all.
const SpendingHistory = dynamic(() => import('./SpendingHistory'), {
  ssr: false,
  loading: () => <div className="h-[26rem] bg-surface-1 border border-surface-3 rounded-xl animate-pulse" />,
})

export default SpendingHistory
