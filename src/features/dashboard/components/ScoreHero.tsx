'use client'

import { useCountUp } from '@/lib/use-count-up'

const SIZE = 168

// CSS conic-gradient ring (design source's `ringStyle()` recipe) — a single
// accent-colored disc swept to `score`%, remainder var(--border), with an
// inner var(--surface-1)-filled hole so the track/hole stay theme-aware with
// no hardcoded hex. The level label and yesterday-delta live in the
// ScoreExplainer popover instead of here, matching the design source (which
// keeps this hero card to just the number).
export default function ScoreHero({ score }: { score: number }) {
  const animated = useCountUp(score)
  const deg = (animated / 100) * 360

  return (
    <div
      className="relative rounded-full"
      style={{ width: SIZE, height: SIZE, background: `conic-gradient(var(--accent) ${deg}deg, var(--border) ${deg}deg 360deg)` }}
    >
      <div className="absolute inset-4 rounded-full bg-surface-1 flex flex-col items-center justify-center">
        <span
          className="text-[48px] font-extrabold tracking-[-0.03em] tabular-nums leading-none bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--cyan))' }}
        >
          {animated}
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.3px] text-fg-tertiary mt-1">Out of 100</span>
      </div>
    </div>
  )
}
