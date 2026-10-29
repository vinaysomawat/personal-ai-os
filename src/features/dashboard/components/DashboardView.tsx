import Link from 'next/link'
import Card from '@/components/Card'
import MiniRing from './MiniRing'
import RealtimeRefresh from './RealtimeRefresh'
import ScoreExplainer from '@/features/brain/components/ScoreExplainer'
import BrainAdvisorTrigger from '@/features/brain/components/BrainAdvisorTrigger'
import NeedsAttention from './NeedsAttention'
import QuickStats from './QuickStats'
import HuntHero from './HuntHero'
import type { HuntHero as HuntHeroData } from '../hunt-hero'
import { explainScore } from '@/features/brain/calculations'
import { buildBrainContext } from '@/features/brain/context-builder'
import type { getDashboardData } from '../actions'
import type { ExecutiveData } from '@/features/brain/executive-actions'
import LifeScoreTrend from './LifeScoreTrendLazy'
import { todayISTLabel, istHour } from '@/lib/date'
import PageHeader from '@/components/PageHeader'

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export default function DashboardView({ data, executive, hunt }: { data: DashboardData; executive: ExecutiveData; hunt: HuntHeroData | null }) {
  const { stats, scores, scoreTips, scoreHistory, scoreBreakdown, lifeDelta, topActions, todayProgress } = data
  const scoreExplanation = explainScore(scoreBreakdown, { score: scores.life, delta: lifeDelta }, scoreTips)
  const brainContext = buildBrainContext(data)
  const today = todayISTLabel()
  const hour = istHour()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-3">
      <RealtimeRefresh />
      <BrainAdvisorTrigger context={brainContext} />
      {/* Page title now lives inline in the page body (design refresh) instead
          of the removed shared Header component — TopNav's title slot is a
          transitional fallback for pages that haven't made this move yet. */}
      <PageHeader title="Dashboard" action={<>
        {/* Dasha info replaces the plain greeting here (2026-08-18, per the
            Claude Design source) — the standalone Astrology strip that used
            to render below Top Priority was removed from the design in
            favor of folding just the dasha lords into this date line;
            tithi/nakshatra detail still lives on the Astrology page itself.
            Falls back to the greeting when no birth chart exists yet. */}
        <p className="text-[13px] text-fg-tertiary">
          {today} · {data.astrology ? <Link href="/astrology" className="hover:text-accent transition-colors">{data.astrology.dashaLord} / {data.astrology.antardashaLord} dasha</Link> : greeting}
        </p>
      </>} />

      {/* Your turn (Needs Attention: risks + Today's Focus signals, top 3)
          beside Daily Mission, first on the page — what needs you comes
          before the scores. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <NeedsAttention topActions={topActions} risks={executive.risks} />
        <Card title="Daily Mission" action={<span className="text-xs text-fg-tertiary">{todayProgress.completed}/{todayProgress.total} done</span>}>
          <div className="flex items-center gap-3.5">
            <div className="shrink-0">
              <MiniRing score={todayProgress.score} color="var(--accent)" size={52} suffix="%" />
            </div>
            <div className="flex-1 min-w-0">
              {todayProgress.items.length > 0 ? (
                <ul className="space-y-0.5">
                  {todayProgress.items.map(item => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 py-0.5 text-[12.5px] transition-colors ${
                          item.done ? 'text-fg-tertiary' : 'text-fg-secondary hover:text-accent'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.done ? 'bg-good' : 'bg-accent'}`} />
                        <span className={`truncate ${item.done ? 'line-through' : ''}`}>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-secondary">Everything for today is done 🎉</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Job Hunt Mode: the Hunt Hero replaces Life Score + Quick Stats. */}
      {hunt ? <HuntHero hero={hunt} /> : (<>
        {/* Hero: Life Score card + Quick Stats/Goal Progress side by side,
            matching the design's [Life Score | Quick Stats] grid — Quick Stats
            (Phase 5 PRD's "Sidebar Widget") already stacks the 3 stat tiles
            above the Goal Progress bars internally, so it drops in as one
            column unchanged. */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-[var(--grid-gap)] items-start">
          <div className="bg-surface-1 border border-surface-3 rounded-[10px] shadow-card p-[var(--card-pad-lg)] flex flex-col items-center gap-2">
            <p className="text-xs text-fg-tertiary uppercase tracking-[0.5px] self-start font-semibold">Life Score</p>
            <ScoreExplainer score={scores.life ?? 0} result={scoreExplanation} />
            <p className="text-xs text-fg-tertiary">Click ring to explain score</p>
          </div>
          <QuickStats
            prepStreak={stats.prepStreak}
            prepToday={data.prepToday}
            workoutStreak={stats.workoutStreak}
            workoutCategory={data.workoutCategory}
            budgetRemaining={stats.monthBudget - stats.monthSpend}
            budgetTotal={stats.monthBudget}
            workoutDoneToday={stats.workoutsToday > 0}
          />
        </div>
      </>)}

      {!hunt && <LifeScoreTrend scoreHistory={scoreHistory} />}
    </div>
  )
}
