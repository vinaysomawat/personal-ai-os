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
    <div className="flex flex-col gap-3">
      <div className="bg-surface-2 rounded-[10px] px-3.5 py-3">
        <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">Overall</p>
        <p className="text-[13px] text-fg-primary mt-1">{review.overall}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {MODULE_ROWS.map(({ key, label }) => review[key] && (
          <li key={key} className="pt-2 border-t border-surface-3 first:border-0 first:pt-0">
            <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.4px]">{label}</p>
            <p className="text-[13px] text-fg-secondary mt-0.5">{review[key]}</p>
          </li>
        ))}
      </ul>

      {review.biggestAchievement && (
        <div className="bg-good-soft rounded-[10px] px-3.5 py-3">
          <p className="text-[11px] font-bold text-good uppercase tracking-[0.4px]">🏆 Biggest Achievement</p>
          <p className="text-[13px] text-fg-primary mt-1">{review.biggestAchievement}</p>
        </div>
      )}
      {review.biggestMistake && (
        <div className="bg-risk-soft rounded-[10px] px-3.5 py-3">
          <p className="text-[11px] font-bold text-risk uppercase tracking-[0.4px]">⚠ Biggest Mistake</p>
          <p className="text-[13px] text-fg-primary mt-1">{review.biggestMistake}</p>
        </div>
      )}
      {review.recommendation && (
        <div className="bg-accent-soft rounded-[10px] px-3.5 py-3">
          <p className="text-[11px] font-bold text-accent-strong uppercase tracking-[0.4px]">→ Recommendation</p>
          <p className="text-[13px] text-fg-primary mt-1">{review.recommendation}</p>
        </div>
      )}
    </div>
  )
}
