import type { Risk, Opportunity } from '@/features/brain/risk-opportunity-engine'
import type { TopAction } from './actions'

export type PriorityItem =
  | { type: 'risk'; kind: Risk['kind']; text: string; impact: Risk['impact']; action: string }
  | { type: 'signal'; emoji: string; text: string; href: string }
  | { type: 'opportunity'; kind: Opportunity['kind']; text: string }

// Shared by NeedsAttention (top 3) and the Dashboard's top-priority banner
// (item 0 of the same list) so both agree on the exact same ranking —
// risks lead, then Today's Focus signals, then opportunities — rather than
// two components independently reimplementing the same ordering.
export function buildPriorityItems(risks: Risk[], topActions: TopAction[], opportunities: Opportunity[]): PriorityItem[] {
  return [
    ...risks.map((r): PriorityItem => ({ type: 'risk', ...r })),
    ...topActions.map((a): PriorityItem => ({ type: 'signal', ...a })),
    ...opportunities.map((o): PriorityItem => ({ type: 'opportunity', ...o })),
  ]
}

// Risks/opportunities aren't tied to a module the way Today's Focus signals
// already are (those carry their own href) — this maps each known kind to
// the module it's actually about, so those items can link out too.
export const KIND_HREF: Record<Risk['kind'] | Opportunity['kind'], string> = {
  budget_pace: '/finance',
  protein_decline: '/health',
  coding_streak: '/coding',
  interview_momentum: '/career',
}
