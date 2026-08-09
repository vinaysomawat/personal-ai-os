import type { Decision } from '../types'

const CONFIDENCE_COLOR: Record<Decision['confidence'], string> = {
  high: 'text-good bg-good-soft',
  medium: 'text-warn bg-warn-soft',
  low: 'text-risk bg-risk-soft',
}

export default function DecisionCard({ decision }: { decision: Decision }) {
  if (!decision.decision) {
    return <p className="text-sm text-fg-tertiary">{decision.reasoning}</p>
  }

  return (
    <div className="bg-surface-2 rounded-[10px] p-[14px] text-[13px] leading-[1.5] flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <p className="font-bold text-fg-primary">{decision.decision}</p>
        <span className={`shrink-0 text-[10px] font-bold rounded-[10px] px-[9px] py-[3px] whitespace-nowrap ${CONFIDENCE_COLOR[decision.confidence]}`}>
          {decision.confidence.charAt(0).toUpperCase() + decision.confidence.slice(1)}
        </span>
      </div>

      {decision.reasoning && <p className="text-fg-secondary">{decision.reasoning}</p>}

      {decision.tradeoffs.length > 0 && (
        <div>
          <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px] mb-1">Tradeoffs</p>
          <ul className="flex flex-col gap-1">
            {decision.tradeoffs.map((t, i) => (
              <li key={i} className="text-fg-secondary flex items-start gap-1.5">
                <span className="text-fg-tertiary shrink-0">·</span>{t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decision.actionItems.length > 0 && (
        <div>
          <p className="text-[11px] text-fg-tertiary uppercase tracking-[0.4px] mb-1">Action Items</p>
          <ul className="flex flex-col gap-1">
            {decision.actionItems.map((a, i) => (
              <li key={i} className="text-fg-secondary flex items-start gap-1.5">
                <span className="text-fg-tertiary shrink-0">·</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
