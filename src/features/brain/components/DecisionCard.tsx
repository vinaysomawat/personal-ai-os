import type { Decision } from '../types'

const CONFIDENCE_COLOR: Record<Decision['confidence'], string> = {
  high: 'text-green-400 bg-good-soft',
  medium: 'text-amber-400 bg-warn-soft',
  low: 'text-red-400 bg-risk-soft',
}

export default function DecisionCard({ decision }: { decision: Decision }) {
  if (!decision.decision) {
    return <p className="text-sm text-fg-tertiary">{decision.reasoning}</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-fg-primary">{decision.decision}</p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLOR[decision.confidence]}`}>
          {decision.confidence} confidence
        </span>
      </div>

      {decision.reasoning && <p className="text-sm text-fg-secondary leading-relaxed">{decision.reasoning}</p>}

      {decision.tradeoffs.length > 0 && (
        <div>
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Trade-offs</p>
          <ul className="space-y-0.5">
            {decision.tradeoffs.map((t, i) => (
              <li key={i} className="text-sm text-fg-secondary flex items-start gap-2">
                <span className="text-fg-quaternary shrink-0">–</span>{t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decision.actionItems.length > 0 && (
        <div>
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Action items</p>
          <ul className="space-y-0.5">
            {decision.actionItems.map((a, i) => (
              <li key={i} className="text-sm text-fg-secondary flex items-start gap-2">
                <span className="text-accent shrink-0">✓</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
