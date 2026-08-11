'use client'

import { useCountUp } from '@/lib/use-count-up'

// CSS conic-gradient ring (design source's `ringStyle()` recipe) instead of
// an SVG stroke — a solid-color disc masked by an inner var(--card)-filled
// hole, so it stays theme-aware for free with no hardcoded hex track color.
// `size` matches the design source's per-context sizing exactly rather than
// a single proportional formula — the source hardcodes a distinct inner-hole
// size and font-size per usage (74px ring → 58px hole/15px text; 52px ring →
// 40px hole/12px text) that don't share one ratio, so this looks them up by
// the known sizes and falls back to a reasonable proportional estimate for
// anything else.
const KNOWN_SIZES: Record<number, { inset: number; fontSize: number }> = {
  74: { inset: 8, fontSize: 15 },
  52: { inset: 6, fontSize: 12 },
}

export default function MiniRing({ score, color, size = 40, suffix = '', glow = false }: { score: number; color: string; size?: number; suffix?: string; glow?: boolean }) {
  const animated = useCountUp(score)
  const deg = (animated / 100) * 360
  const known = KNOWN_SIZES[size]
  const inset = known ? known.inset : Math.max(2, Math.round(size * 0.08))
  const fontSize = known ? known.fontSize : Math.max(9, Math.round(size * 0.26))
  // design's ringStyle() glow option: a soft drop-shadow in the ring's own
  // color, strength tuned per-theme via --ring-glow-strength (dark needs a
  // stronger glow to read against a dark background than light does).
  const filter = glow ? `drop-shadow(0 0 ${Math.round(size * 0.09)}px color-mix(in srgb, ${color} calc(var(--ring-glow-strength) * 100%), transparent))` : undefined

  return (
    <div
      className="relative rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(${color} ${deg}deg, var(--border) ${deg}deg 360deg)`, filter }}
    >
      <div className="absolute rounded-full bg-surface-1 flex items-center justify-center" style={{ inset }}>
        <span className="font-bold tabular-nums" style={{ color, fontSize }}>{animated}{suffix}</span>
      </div>
    </div>
  )
}
