'use client'

import { useCountUp } from '@/lib/use-count-up'

// CSS conic-gradient ring (design source's `ringStyle()` recipe) instead of
// an SVG stroke — a solid-color disc masked by an inner var(--card)-filled
// hole, so it stays theme-aware for free with no hardcoded hex track color.
// `size` matches the design source's per-context sizing (e.g. 74px for
// Module Scores, 52px for the Daily Mission ring) rather than one fixed size
// everywhere.
export default function MiniRing({ score, color, size = 40 }: { score: number; color: string; size?: number }) {
  const animated = useCountUp(score)
  const deg = (animated / 100) * 360
  const inset = Math.max(2, Math.round(size * 0.08))
  const fontSize = Math.max(9, Math.round(size * 0.26))

  return (
    <div
      className="relative rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${deg}deg, var(--border) ${deg}deg 360deg)` }}
    >
      <div className="absolute rounded-full bg-surface-1 flex items-center justify-center" style={{ inset }}>
        <span className="font-bold tabular-nums" style={{ color, fontSize }}>{animated}</span>
      </div>
    </div>
  )
}
