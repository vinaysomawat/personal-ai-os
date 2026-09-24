'use client'

import type { FoodLogEntry } from '../food-log'

// Items logged via the Health Telegram bot today, each with its AI-estimated
// kcal/protein — the per-item breakdown behind the Calories/Protein tiles,
// so a bad estimate can be spotted and removed (which also subtracts it from
// the day's totals, same as the bot's Undo button).
export default function TodaysFoodCard({ entries, onDelete }: { entries: FoodLogEntry[]; onDelete: (entry: FoodLogEntry) => void }) {
  const totalKcal = entries.reduce((s, e) => s + Number(e.calories), 0)
  const totalProtein = entries.reduce((s, e) => s + Number(e.protein_g), 0)

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-md)]">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-bold text-fg-primary">Today&apos;s Food</p>
        {entries.length > 0 && <p className="text-[11px] text-fg-tertiary tabular-nums">{entries.length} items · <span className="text-fg-primary font-semibold">{totalKcal} kcal · {totalProtein}g protein</span></p>}
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-fg-tertiary">Nothing logged yet today — send what you ate to the Health bot (e.g. &quot;2 rotis with dal&quot;).</p>
      ) : (
        <ul className="max-h-56 overflow-y-auto -mx-1">
          {entries.map(e => (
            <li key={e.id} className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-surface-2 text-[12px]">
              <span className="text-fg-secondary truncate flex-1 min-w-0">
                {e.item}{e.quantity ? <span className="text-fg-tertiary"> · {e.quantity}{e.unit ? ` ${e.unit}` : ''}</span> : null}
              </span>
              <span className="text-fg-tertiary tabular-nums shrink-0">{e.calories} kcal</span>
              <span className="text-fg-tertiary tabular-nums shrink-0 w-10 text-right">{e.protein_g}g</span>
              <button onClick={() => onDelete(e)} aria-label={`Remove ${e.item}`} className="shrink-0 text-fg-quaternary hover:text-red-400 text-[11px] p-1 -m-0.5">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
