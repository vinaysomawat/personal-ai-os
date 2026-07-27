import Link from 'next/link'
import {
  CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText,
} from 'lucide-react'
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

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export default function DashboardView({ data, executive }: { data: DashboardData; executive: ExecutiveData }) {
  const { botActivity, stats, scores, scoreTips, scoreHistory, todayHealth, aiBudget, topActions, todayProgress, todayRecommendations } = data
  const scoreExplanation = explainScore(scoreHistory, scores, scoreTips)
  const brainContext = buildBrainContext(data)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const moduleScores = [
    { label: 'Health',   score: scores.health,            color: '#ef4444', to: '/health',   tip: scoreTips.health },
    { label: 'Finance',  score: scores.finance,           color: '#22c55e', to: '/finance',  tip: scoreTips.finance },
    { label: 'Career',   score: scores.career,            color: '#f59e0b', to: '/career',   tip: scoreTips.career },
    { label: 'Learning', score: scores.learning,          color: '#a855f7', to: '/learning', tip: scoreTips.learning },
    { label: 'Coding',   score: scores.projects ?? 0,     color: '#06b6d4', to: '/coding',   tip: scoreTips.projects },
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

  const modules = [
    { label: 'Planner',   to: '/planner',   icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-500/10',   stat: stats.pendingTaskCount ? `${stats.pendingTaskCount} pending` : 'All clear' },
    { label: 'Career',    to: '/career',    icon: Briefcase,    color: 'text-amber-400',  bg: 'bg-warn-soft',  stat: stats.activeApplications ? `${stats.activeApplications} active` : 'No applications' },
    { label: 'Health',    to: '/health',    icon: HeartPulse,   color: 'text-red-400',    bg: 'bg-risk-soft',    stat: todayHealth?.steps ? `${(Number(todayHealth.steps)/1000).toFixed(1)}k steps` : stats.workoutsToday ? `${stats.workoutsToday} workout${stats.workoutsToday > 1 ? 's' : ''} today` : 'No metrics today' },
    { label: 'Finance',   to: '/finance',   icon: DollarSign,   color: 'text-green-400',  bg: 'bg-good-soft',  stat: stats.monthSpend ? `₹${Math.round(stats.monthSpend).toLocaleString('en-IN')} spent` : 'No expenses' },
    { label: 'Learning',  to: '/learning',  icon: BookOpen,     color: 'text-purple-400', bg: 'bg-purple-500/10', stat: stats.learningInProgress ? `${stats.learningInProgress} in progress` : 'No resources' },
    { label: 'Coding',    to: '/coding',    icon: Code2,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   stat: stats.codingSolved30d ? `${stats.codingSolved30d} solved (30d)` : 'No questions solved yet' },
    { label: 'Documents', to: '/documents', icon: FileText,     color: 'text-orange-400', bg: 'bg-orange-500/10', stat: stats.documentCount ? `${stats.documentCount} doc${stats.documentCount !== 1 ? 's' : ''}` : 'Empty' },
  ]

  return (
    <div className="space-y-4">
      <RealtimeRefresh />
      <BrainAdvisorTrigger context={brainContext} />
      {/* Page title now lives inline in the page body (design refresh) instead
          of the removed shared Header component — TopNav's title slot is a
          transitional fallback for pages that haven't made this move yet. */}
      <div className="flex items-end justify-between flex-wrap gap-1">
        <div>
          <p className="text-[13px] text-fg-tertiary">{today} · {greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg-primary mt-0.5">Dashboard</h1>
        </div>
      </div>

      {/* Top priority — the single highest-ranked Needs Attention item,
          surfaced here so the most important action doesn't require
          scrolling past four other cards to find. Full top-3 detail (with
          dismiss) still lives in the Needs Attention card further down. */}
      {topPriority && (
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-risk-soft border border-risk-border">
          <span className="text-lg shrink-0">{topPriority.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-risk-strong">Top Priority</p>
            <p className="text-sm text-fg-primary mt-0.5">{topPriority.text}</p>
          </div>
          <Link href={topPriority.href} className="shrink-0 text-xs text-fg-secondary whitespace-nowrap border border-border-strong rounded-lg px-3 py-1.5 hover:bg-surface-2 transition-colors">
            Open {topPriorityModule} →
          </Link>
        </div>
      )}

      {/* Hero: Life Score card + Quick Stats/Goal Progress side by side,
          matching the design's [Life Score | Quick Stats] grid — Quick Stats
          (Phase 5 PRD's "Sidebar Widget") already stacks the 3 stat tiles
          above the Goal Progress bars internally, so it drops in as one
          column unchanged. */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
        <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-fg-tertiary uppercase tracking-widest self-start font-semibold">Life Score</p>
          <ScoreExplainer score={scores.life ?? 0} result={scoreExplanation} />
          <p className="text-xs text-fg-tertiary">Click ring to explain score</p>
        </div>
        <QuickStats
          codingStreak={executive.codingStreak}
          codingQuestionPending={data.codingQuestionPending}
          budgetRemaining={stats.monthBudget - stats.monthSpend}
          budgetTotal={stats.monthBudget}
          workoutDoneToday={stats.workoutsToday > 0}
          goals={data.financialGoals}
        />
      </div>

      {/* What's Changed + Morning Brief (Phase 4/5 PRDs) side by side on
          wide viewports — Decision Queue/Goal Progress used to live in the
          brief too, but Phase 5 moved them into Needs Attention and Quick
          Stats above instead of duplicating information across cards. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <WhatsChanged items={executive.whatsChanged} />
        <ExecutiveBrief brief={executive.brief} />
      </div>

      {/* Needs Attention (Today's Focus signals + Decision Queue's Risks/
          Opportunities, capped at 3) + Today's Insight side by side. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <NeedsAttention topActions={topActions} risks={executive.risks} opportunities={executive.opportunities} />
        <TodaysInsight pattern={data.recentPatterns[0] ?? null} />
      </div>

      {/* Life Score Trend + Daily Mission side by side — Daily Mission
          resets to a fresh checklist every midnight, separate from the
          persistent Life Score above. Deterministic, cross-module
          (Planner/Health/Coding/Learning/Finance) — same primitive the
          Phase 2 "Brain" PRD calls Daily Mission. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <LifeScoreTrend scoreHistory={scoreHistory} />
        <Card title="Daily Mission" padding="p-3.5" action={<span className="text-xs text-fg-tertiary">{todayProgress.completed}/{todayProgress.total} done</span>}>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <MiniRing score={todayProgress.score} color="#8b5cf6" size={52} />
            </div>
            <div className="flex-1 min-w-0">
              {todayRecommendations.length > 0 ? (
                <ul className="space-y-0.5">
                  {todayRecommendations.map(r => (
                    <li key={r.text}>
                      <Link href={r.href} className="flex items-center gap-2 py-0.5 text-sm text-fg-secondary hover:text-accent transition-colors">
                        <span className="shrink-0">{r.emoji}</span>
                        <span className="truncate">{r.text}</span>
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
      <div className="bg-surface-1 border border-surface-3 rounded-2xl shadow-card p-4">
        <p className="text-xs text-fg-tertiary uppercase tracking-widest mb-3 font-semibold">Module Scores</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {moduleScores.map(({ label, score, color, to, tip }) => (
            <Link key={to} href={to} title={tip}
              className="flex flex-col items-center gap-2 text-center hover:scale-[1.03] transition-transform group">
              <MiniRing score={score} color={color} size={74} />
              <p className="text-xs font-semibold text-fg-secondary group-hover:text-fg-primary">{label}</p>
              <p className="text-[10px] text-fg-tertiary leading-tight truncate max-w-[90px]">{tip}</p>
            </Link>
          ))}
        </div>
        <p className="text-xs text-fg-quaternary mt-2 text-center">
          Health 25% · Finance 20% · Career 20% · Learning 20% · Coding 15%
        </p>
      </div>

      {/* Module grid */}
      <div>
        <p className="text-xs text-fg-quaternary uppercase tracking-widest mb-2">Modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {modules.map(({ label, to, icon: Icon, color, bg, stat }) => (
            <Link key={to} href={to}
              className="group flex flex-col gap-2 p-3.5 bg-surface-1 border border-surface-3 rounded-xl shadow-card hover:border-accent/40 hover:bg-surface-2 hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-fg-primary group-hover:text-white transition-colors">{label}</p>
                <p className="text-xs text-fg-tertiary mt-0.5 truncate">{stat}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BotActivityCard botActivity={botActivity} aiBudget={aiBudget} />
    </div>
  )
}
