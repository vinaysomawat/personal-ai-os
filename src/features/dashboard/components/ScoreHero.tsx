'use client'

import { useEffect, useState } from 'react'
import { todayIST } from '@/lib/date'

const SCORE_KEY = 'vos_life_score'
const DATE_KEY  = 'vos_life_score_date'

export default function ScoreHero({ score }: { score: number }) {
  const [delta, setDelta] = useState<number | null>(null)

  useEffect(() => {
    const today       = todayIST()
    const storedDate  = localStorage.getItem(DATE_KEY)
    const storedScore = localStorage.getItem(SCORE_KEY)

    if (storedScore && storedDate && storedDate < today) {
      setDelta(score - Number(storedScore))
    }

    if (storedDate !== today) {
      localStorage.setItem(SCORE_KEY, String(score))
      localStorage.setItem(DATE_KEY, today)
    }
  }, [score])

  const r    = 56
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  const level =
    score >= 90 ? 'Outstanding'     :
    score >= 75 ? 'Excellent'       :
    score >= 60 ? 'Good Progress'   :
    score >= 45 ? 'Average'         :
    score >= 30 ? 'Needs Work'      : 'Getting Started'

  const levelColor =
    score >= 75 ? 'text-green-400' :
    score >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {/* Glow */}
        <div className="absolute inset-3 rounded-full blur-2xl opacity-20 bg-gradient-to-br from-[#7c6af7] to-[#06b6d4]" />
        <svg viewBox="0 0 144 144" className="w-28 h-28 relative z-10" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="72" cy="72" r={r} fill="none" stroke="#26263a" strokeWidth="10" />
          <circle cx="72" cy="72" r={r} fill="none"
            stroke="url(#lifeGrad)" strokeWidth="10"
            strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
            strokeLinecap="round" />
          <defs>
            <linearGradient id="lifeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c6af7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-2xl font-bold text-white tabular-nums leading-none">{score}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">/100</span>
        </div>
      </div>

      <div className="text-center space-y-0.5">
        <p className={`text-xs font-bold ${levelColor}`}>{level}</p>
        {delta !== null && (
          <p className={`text-[11px] font-medium ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {delta > 0 ? `+${delta}` : delta} from yesterday
          </p>
        )}
      </div>
    </div>
  )
}
