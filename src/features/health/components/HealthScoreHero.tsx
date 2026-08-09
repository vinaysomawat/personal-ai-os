'use client'

import { Settings2 } from 'lucide-react'
import type { HealthScoreBreakdown } from '../calculations'

// CSS conic-gradient ring (design source's `ringStyle()` recipe) — a single
// semantic-color disc swept to `score`%, remainder var(--border), matching
// the same recipe Dashboard's MiniRing/ScoreHero use, instead of a raw-hex
// SVG stroke gradient.
function MiniRing({ score, color, size = 32 }: { score: number; color: string; size?: number }) {
  const deg = (score / 100) * 360
  const inset = Math.max(2, Math.round(size * 0.14))
  return (
    <div className="relative rounded-full shrink-0" style={{ width: size, height: size, background: `conic-gradient(${color} ${deg}deg, var(--border) ${deg}deg 360deg)` }}>
      <div className="absolute rounded-full bg-surface-1" style={{ inset }} />
    </div>
  )
}

// Weights match calculations.ts's healthScore formula (nutrition*0.6 + activity*0.4).
const SUB_SCORES: { key: keyof Omit<HealthScoreBreakdown, 'overall'>; label: string; color: string; weight: string }[] = [
  { key: 'nutrition',   label: 'Nutrition',   color: 'var(--warn)', weight: '0.6×' },
  { key: 'activity',    label: 'Activity',    color: 'var(--good)', weight: '0.4×' },
]

export default function HealthScoreHero({ score, onEditProfile }: { score: HealthScoreBreakdown; onEditProfile?: () => void }) {
  const deg = (score.overall / 100) * 360

  const level =
    score.overall >= 85 ? 'Excellent' :
    score.overall >= 65 ? 'Good' :
    score.overall >= 40 ? 'Needs Work' : 'Getting Started'

  const levelColor =
    score.overall >= 65 ? 'text-green-400' :
    score.overall >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)]">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-[13px] font-bold text-fg-primary">Health Score</p>
        {onEditProfile && (
          <button onClick={onEditProfile} className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-border-strong text-[11.5px] text-fg-secondary hover:bg-surface-2 transition-colors whitespace-nowrap">
            <Settings2 size={11} /> Edit profile
          </button>
        )}
      </div>
      <div className="flex items-center gap-[18px]">
        <div className="relative shrink-0 rounded-full" style={{ width: 82, height: 82, background: `conic-gradient(var(--good) ${deg}deg, var(--border) ${deg}deg 360deg)` }}>
          <div className="absolute inset-2 rounded-full bg-surface-1 flex items-center justify-center">
            <span className="text-xl font-bold text-fg-primary tabular-nums">{score.overall}</span>
          </div>
        </div>

        <div className="min-w-0">
          <p className={`text-[13px] font-bold ${levelColor}`}>{level}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            {SUB_SCORES.map(({ key, label, color, weight }) => {
              const s = score[key]
              return (
                <div key={key} className="flex items-center gap-1.5 min-w-0">
                  <MiniRing score={s.score} color={color} size={22} />
                  <div className="min-w-0">
                    <p className="text-[11px] text-fg-tertiary">{label} · {weight}</p>
                    {/* Reason text kept always-visible rather than design's hover-only
                        title tooltip — tooltips aren't reachable on touch devices, and
                        this explains *why* the sub-score is what it is (CLAUDE.md's
                        "every page should answer what happened, why, and what to do
                        next"). */}
                    <p className="text-[10.5px] text-fg-quaternary truncate max-w-[140px]" title={s.reason}>{s.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
