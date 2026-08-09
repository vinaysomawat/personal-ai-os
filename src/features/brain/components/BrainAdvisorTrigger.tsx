'use client'

import { Brain } from 'lucide-react'
import { useAIAdvisor } from '@/components/AIAdvisorProvider'
import BrainPanel from './BrainPanel'
import type { BrainContext } from '../types'

// DashboardView is a server component (it can't call the useAIAdvisor hook
// itself), so — same as every other module's advisor trigger — this small
// client wrapper registers the Header trigger and portals the panel content
// into the shared advisor panel.
export default function BrainAdvisorTrigger({ context }: { context: BrainContext }) {
  // Design specifies Ask Brain's drawer at width: min(440px, 100vw) — wider
  // than the 5 generic module advisors' 400px default.
  return useAIAdvisor('Ask Brain', Brain, <BrainPanel context={context} />, 440)
}
