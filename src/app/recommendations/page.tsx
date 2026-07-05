import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getDashboardData } from '@/features/dashboard/actions'
import { getAIRecommendations } from '@/features/ai/recommendations'

const MODULE_META: Record<string, { label: string; emoji: string; color: string; bg: string; to: string }> = {
  planner:  { label: 'Planner',  emoji: '📋', color: 'text-blue-400',   bg: 'bg-blue-500/10',   to: '/planner' },
  career:   { label: 'Career',   emoji: '💼', color: 'text-amber-400',  bg: 'bg-amber-500/10',  to: '/career' },
  finance:  { label: 'Finance',  emoji: '💸', color: 'text-green-400',  bg: 'bg-green-500/10',  to: '/finance' },
  health:   { label: 'Health',   emoji: '💪', color: 'text-red-400',    bg: 'bg-red-500/10',    to: '/health' },
  learning: { label: 'Learning', emoji: '📚', color: 'text-purple-400', bg: 'bg-purple-500/10', to: '/learning' },
  projects: { label: 'Projects', emoji: '💻', color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   to: '/coding' },
}

export default async function RecommendationsPage() {
  const data = await getDashboardData()
  const recommendations = await getAIRecommendations(data).catch(() => [])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">{today}</p>
        <h2 className="text-2xl font-bold text-white">Today&apos;s Recommendations</h2>
        <p className="text-sm text-slate-500 mt-1">AI-generated actions to improve your Life Score today</p>
      </div>

      {/* Life Score context */}
      <div className="flex items-center gap-4 p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <Sparkles size={18} className="text-accent shrink-0" />
        <p className="text-sm text-slate-400">
          Current Life Score: <span className="text-white font-bold">{data.scores.life}</span>/100 ·
          Lowest module: <span className="text-white font-medium">
            {Object.entries({
              Health: data.scores.health,
              Finance: data.scores.finance,
              Career: data.scores.career,
              Learning: data.scores.learning,
              Projects: data.scores.projects ?? 0,
            }).sort(([, a], [, b]) => a - b)[0]?.[0]}
          </span>
        </p>
      </div>

      {/* Recommendations list */}
      {recommendations.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No recommendations available — check your API key.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {recommendations.map((rec, i) => {
            const meta = MODULE_META[rec.module] ?? MODULE_META['planner']
            return (
              <li key={i} className="flex items-center gap-4 p-4 bg-surface-1 border border-surface-3 rounded-xl hover:border-accent/30 transition-colors group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-3 shrink-0">
                  <span className="text-xs font-bold text-slate-500">{i + 1}</span>
                </div>
                <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 text-xl`}>
                  {rec.emoji || meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{rec.action}</p>
                  <p className={`text-xs mt-0.5 font-medium ${meta.color}`}>{meta.label}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                    {rec.impact}
                  </span>
                  <Link href={meta.to}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-accent transition-all">
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Module score context */}
      <div className="border border-surface-3 rounded-xl p-4">
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">Module Scores</p>
        <div className="space-y-2">
          {[
            { label: 'Health',   score: data.scores.health,            color: 'bg-red-400' },
            { label: 'Finance',  score: data.scores.finance,           color: 'bg-green-400' },
            { label: 'Career',   score: data.scores.career,            color: 'bg-amber-400' },
            { label: 'Learning', score: data.scores.learning,          color: 'bg-purple-400' },
            { label: 'Projects', score: data.scores.projects ?? 0,     color: 'bg-cyan-400' },
          ].map(({ label, score, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-400 w-8 text-right tabular-nums">{score}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
