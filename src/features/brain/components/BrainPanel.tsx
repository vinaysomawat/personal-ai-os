'use client'

import BrainChat from './BrainChat'
import type { BrainContext } from '../types'

// Ask Brain — a single Ask view (Decide / Reflect / Monthly tabs removed
// 2026-10-10).
export default function BrainPanel({ context }: { context: BrainContext }) {
  return <BrainChat context={context} />
}
