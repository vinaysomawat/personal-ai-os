import Link from 'next/link'
import Card from '@/components/Card'
import MiniRing from './MiniRing'
import RealtimeRefresh from './RealtimeRefresh'
import BotActivityCard from './BotActivityCard'
import ScoreExplainer from '@/features/brain/components/ScoreExplainer'
import BrainAdvisorTrigger from '@/features/brain/components/BrainAdvisorTrigger'
import ExecutiveBrief from './ExecutiveBrief'
import WhatsChanged from './WhatsChanged'
import NeedsAttention from './NeedsAttention'
import TodaysInsight from './TodaysInsight'
import QuickStats from './QuickStats'
import EveningReflection from './EveningReflection'
import { explainScore } from '@/features/brain/calculations'
import { buildBrainContext } from '@/features/brain/context-builder'
import { buildPriorityItems, KIND_HREF } from '../priority'
import type { getDashboardData } from '../actions'
import type { ExecutiveData } from '@/features/brain/executive-actions'
import LifeScoreTrend from './LifeScoreTrendLazy'
import { todayISTLabel, istHour } from '@/lib/date'

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export default function DashboardView({ data, executive }: { data: DashboardData; executive: ExecutiveData }) {
  const { botActivity, stats, scores, scoreTips, scoreHistory, aiBudget, topActions, todayProgress } = data
  const scoreExplanation = explainScore(scoreHistory, scores, scoreTips)
  const brainContext = buildBrainContext(data)
  const today = todayISTLabel()
  const hour = istHour()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const moduleScores = [
    { label: 'Health',   score: scores.health,            color: 'var(--good)',   to: '/health',   tip: scoreTips.health },
    { label: 'Finance',  score: scores.finance,           color: 'var(--warn)',   to: '/finance',  tip: scoreTips.finance },
    { label: 'Career',   score: scores.career,            color: 'var(--accent)', to: '/career',   tip: scoreTips.career },
    { label: 'Learning', score: scores.learning,          color: 'var(--good)',   to: '/learning', tip: scoreTips.learning },
    { label: 'Coding',   score: scores.projects ?? 0,     color: 'var(--risk)',   to: '/coding',   tip: scoreTips.projects },
  ]

  // Top-priority banner — same ranked list NeedsAttention renders (risks,
  // then Today's Focus signals, then opportunities), just item 0 surfaced
  // right under the greeting instead of buried after Quick Stats/What's
  // Changed/Morning Brief/the Life Score hero.
  const topPriorityRaw = buildPriorityItems(executive.risks, topActions, executive.opportunities)[0] ?? null
  const topPriority = topPriorityRaw && (
    topPriorityRaw.type === 'signal'
      ? { emoji: topPriorityRaw.emoji, text: topPriorityRaw.text, href: topPriorityRaw.href }
      : { emoji: topPriorityRaw.type === 'risk' ? '⚠️' : '🚀', text: topPriorityRaw.text, href: KIND_HREF[topPriorityRaw.kind] }
  )
  const topPriorityModule = topPriority && (topPriority.href.slice(1).charAt(0).toUpperCase() + topPriority.href.slice(2))

  return (
    <div className="space-y-3">
      <RealtimeRefresh />
      <BrainAdvisorTrigger context={brainContext} />
      {/* Page title now lives inline in the page body (design refresh) instead
          of the removed shared Header component — TopNav's title slot is a
          transitional fallback for pages that haven't made this move yet. */}
      <div className="flex items-end justify-between flex-wrap gap-1">
        <div>
          <p className="text-[13px] text-fg-tertiary">{today} · {greeting}</p>
          <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Dashboard</h1>
        </div>
      </div>

      {/* Top priority — the single highest-ranked Needs Attention item,
          surfaced here so the most important action doesn't require
          scrolling past four other cards to find. Full top-3 detail (with
          dismiss) still lives in the Needs Attention card further down. */}
      {topPriority && (
        <div className="flex items-center gap-3.5 px-[18px] py-3.5 rounded-[10px] bg-risk-soft border border-risk-border">
          <span className="text-xl shrink-0">{topPriority.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-risk-strong">Top Priority</p>
            <p className="text-sm text-fg-primary mt-0.5">{topPriority.text}</p>
          </div>
          <Link href={topPriority.href} className="shrink-0 text-[13px] text-fg-secondary whitespace-nowrap border border-border-strong rounded-[7px] px-3 py-1.5 hover:bg-surface-2 transition-colors">
            Open {topPriorityModule} →
          </Link>
        </div>
      )}

      {/* Hero: Life Score card + Quick Stats/Goal Progress side by side,
          matching the design's [Life Score | Quick Stats] grid — Quick Stats
          (Phase 5 PRD's "Sidebar Widget") already stacks the 3 stat tiles
          above the Goal Progress bars internally, so it drops in as one
          column unchanged. */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-[var(--grid-gap)] items-start">
        <div className="bg-surface-1 border border-surface-3 rounded-[18px] shadow-card p-[var(--card-pad-lg)] flex flex-col items-center gap-2">
          <p className="text-xs text-fg-tertiary uppercase tracking-[0.5px] self-start font-semibold">Life Score</p>
          <ScoreExplainer score={scores.life ?? 0} result={scoreExplanation} />
          <p className="text-xs text-fg-tertiary">Click ring to explain score</p>
        </div>
        <QuickStats
          codingStreak={executive.codingStreak}
          codingQuestionPending={data.codingQuestionPending}
          workoutStreak={stats.workoutStreak}
          workoutCategory={data.workoutCategory}
          learningStreak={stats.learningStreak}
          learningInProgress={stats.learningInProgress}
          budgetRemaining={stats.monthBudget - stats.monthSpend}
          budgetTotal={stats.monthBudget}
          workoutDoneToday={stats.workoutsToday > 0}
        />
      </div>

      {/* What's Changed + Morning Brief (Phase 4/5 PRDs) side by side on
          wide viewports — Decision Queue/Goal Progress used to live in the
          brief too, but Phase 5 moved them into Needs Attention and Quick
          Stats above instead of duplicating information across cards. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <WhatsChanged items={executive.whatsChanged} />
        <ExecutiveBrief brief={executive.brief} />
      </div>

      {/* Needs Attention (Today's Focus signals + Decision Queue's Risks/
          Opportunities, capped at 3) + Today's Insight side by side. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <NeedsAttention topActions={topActions} risks={executive.risks} opportunities={executive.opportunities} />
        <TodaysInsight pattern={data.recentPatterns[0] ?? null} />
      </div>

      {/* Life Score Trend + Daily Mission side by side — Daily Mission
          resets to a fresh checklist every midnight, separate from the
          persistent Life Score above. Deterministic, cross-module
          (Planner/Health/Coding/Learning/Finance) — same primitive the
          Phase 2 "Brain" PRD calls Daily Mission. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap)] items-start">
        <LifeScoreTrend scoreHistory={scoreHistory} />
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

      <EveningReflection />

      {/* Module Scores — its own full-width card, matching the design
          (previously merged into the Life Score hero card above). */}
      <div className="bg-surface-1 border border-surface-3 rounded-[18px] shadow-card p-[var(--card-pad-lg)]">
        <p className="text-xs text-fg-tertiary uppercase tracking-[0.5px] mb-3 font-semibold">Module Scores</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {moduleScores.map(({ label, score, color, to, tip }) => (
            <Link key={to} href={to}
              className="relative flex flex-col items-center gap-2 text-center hover:scale-[1.03] transition-transform group">
              <MiniRing score={score} color={color} size={74} glow />
              <p className="text-xs font-semibold text-fg-secondary group-hover:text-fg-primary">{label}</p>
              <p className="text-[9.5px] text-fg-tertiary leading-tight max-w-[90px] truncate">{tip}</p>
              <span className="pointer-events-none absolute top-[74px] mt-1 left-1/2 -translate-x-1/2 z-10 w-max max-w-[180px] bg-surface-2 border border-surface-3 rounded-[6px] px-2.5 py-1.5 text-[11px] text-fg-primary text-center leading-snug opacity-0 group-hover:opacity-100 transition-opacity shadow-popover">
                {tip}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <BotActivityCard botActivity={botActivity} aiBudget={aiBudget} />
    </div>
  )
}
