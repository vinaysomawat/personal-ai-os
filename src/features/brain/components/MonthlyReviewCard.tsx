import type { MonthlyReview } from '../types'

const MODULE_ROWS: { key: keyof MonthlyReview; label: string }[] = [
  { key: 'career', label: 'Career' },
  { key: 'finance', label: 'Finance' },
  { key: 'health', label: 'Health' },
  { key: 'learning', label: 'Learning' },
  { key: 'coding', label: 'Coding' },
]

export default function MonthlyReviewCard({ review }: { review: MonthlyReview }) {
  if (!review.career && !review.biggestAchievement) {
    return <p className="text-sm text-fg-tertiary">{review.overall}</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-secondary leading-relaxed">{review.overall}</p>

      <ul className="space-y-2">
        {MODULE_ROWS.map(({ key, label }) => review[key] && (
          <li key={key} className="pb-2 border-b border-surface-3 last:border-0 last:pb-0">
            <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm text-fg-secondary">{review[key]}</p>
          </li>
        ))}
      </ul>

      {review.biggestAchievement && (
        <div>
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Biggest achievement</p>
          <p className="text-sm text-green-400">{review.biggestAchievement}</p>
        </div>
      )}
      {review.biggestMistake && (
        <div>
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Biggest mistake</p>
          <p className="text-sm text-red-400">{review.biggestMistake}</p>
        </div>
      )}
      {review.recommendation && (
        <div>
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-sm text-accent">{review.recommendation}</p>
        </div>
      )}
    </div>
  )
}
