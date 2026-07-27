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

const SUB_SCORES: { key: keyof Omit<HealthScoreBreakdown, 'overall'>; label: string; color: string }[] = [
  { key: 'nutrition',   label: 'Nutrition',   color: 'var(--warn)' },
  { key: 'activity',    label: 'Activity',    color: 'var(--good)' },
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
    <div className="bg-surface-1 border border-surface-3 rounded-xl p-3.5 relative">
      {onEditProfile && (
        <button onClick={onEditProfile} className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-fg-tertiary hover:text-fg-secondary transition-colors">
          <Settings2 size={12} /> Edit health profile
        </button>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative shrink-0 rounded-full" style={{ width: 82, height: 82, background: `conic-gradient(var(--good) ${deg}deg, var(--border) ${deg}deg 360deg)` }}>
          <div className="absolute inset-2 rounded-full bg-surface-1 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-fg-primary tabular-nums">{score.overall}</span>
            <span className="text-[10px] text-fg-tertiary">/100</span>
          </div>
        </div>

        <div className="flex-1 w-full">
          <p className={`text-sm font-bold mb-2 ${levelColor}`}>{level}</p>
          <div className="flex flex-wrap gap-3">
            {SUB_SCORES.map(({ key, label, color }) => {
              const s = score[key]
              return (
                <div key={key} className="flex items-center gap-2 min-w-0">
                  <MiniRing score={s.score} color={color} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-fg-secondary">{label} <span className="text-fg-quaternary font-normal">{s.score}/100</span></p>
                    <p className="text-[11px] text-fg-quaternary truncate" title={s.reason}>{s.reason}</p>
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
