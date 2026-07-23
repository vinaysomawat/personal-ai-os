import Link from 'next/link'
import {
  CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText, Circle, ListTodo,
} from 'lucide-react'
import Card from '@/components/Card'
import EmptyState from '@/components/EmptyState'
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

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-500',
}

const STATUS_COLOR: Record<string, string> = {
  applied: 'text-blue-400', screening: 'text-amber-400',
  interview: 'text-purple-400', offer: 'text-green-400', rejected: 'text-red-400',
}

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export default function DashboardView({ data, executive }: { data: DashboardData; executive: ExecutiveData }) {
  const { pendingTasks, recentApplications, botActivity, stats, scores, scoreTips, scoreHistory, todayHealth, aiBudget, topActions, todayProgress, todayRecommendations } = data
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

  const modules = [
    { label: 'Planner',   to: '/planner',   icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-500/10',   stat: stats.pendingTaskCount ? `${stats.pendingTaskCount} pending` : 'All clear' },
    { label: 'Career',    to: '/career',    icon: Briefcase,    color: 'text-amber-400',  bg: 'bg-amber-500/10',  stat: stats.activeApplications ? `${stats.activeApplications} active` : 'No applications' },
    { label: 'Health',    to: '/health',    icon: HeartPulse,   color: 'text-red-400',    bg: 'bg-red-500/10',    stat: todayHealth?.steps ? `${(Number(todayHealth.steps)/1000).toFixed(1)}k steps` : stats.workoutsToday ? `${stats.workoutsToday} workout${stats.workoutsToday > 1 ? 's' : ''} today` : 'No metrics today' },
    { label: 'Finance',   to: '/finance',   icon: DollarSign,   color: 'text-green-400',  bg: 'bg-green-500/10',  stat: stats.monthSpend ? `₹${Math.round(stats.monthSpend).toLocaleString('en-IN')} spent` : 'No expenses' },
    { label: 'Learning',  to: '/learning',  icon: BookOpen,     color: 'text-purple-400', bg: 'bg-purple-500/10', stat: stats.learningInProgress ? `${stats.learningInProgress} in progress` : 'No resources' },
    { label: 'Coding',    to: '/coding',    icon: Code2,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   stat: stats.codingSolved30d ? `${stats.codingSolved30d} solved (30d)` : 'No questions solved yet' },
    { label: 'Documents', to: '/documents', icon: FileText,     color: 'text-orange-400', bg: 'bg-orange-500/10', stat: stats.documentCount ? `${stats.documentCount} doc${stats.documentCount !== 1 ? 's' : ''}` : 'Empty' },
  ]

  return (
    <div className="space-y-4">
      <RealtimeRefresh />
      <BrainAdvisorTrigger context={brainContext} />
      {/* Header — the page title itself lives in the shared Header (h1 "Dashboard"); this is just a slim status line, not a second title */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <p className="text-sm font-medium text-slate-300">{greeting}, Vinay</p>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{today}</p>
      </div>

      {/* Top priority — the single highest-ranked Needs Attention item,
          surfaced here so the most important action doesn't require
          scrolling past four other cards to find. Full top-3 detail (with
          dismiss) still lives in the Needs Attention card further down. */}
      {topPriority && (
        <Link href={topPriority.href} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/15 transition-colors group">
          <span className="text-lg shrink-0">{topPriority.emoji}</span>
          <p className="flex-1 text-sm text-slate-200 font-medium">{topPriority.text}</p>
          <span className="text-xs text-accent shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">→</span>
        </Link>
      )}

      {/* Daily Operating System (Phase 5 PRD) — Sidebar Widget (rendered as
          a page-level compact strip, not the persistent nav Sidebar, see
          QuickStats.tsx) + What's Changed, both above everything else per
          the PRD's "one screen answers what changed/what to do/what needs
          attention/goal progress" philosophy. */}
      <QuickStats codingStreak={executive.codingStreak} budgetRemaining={stats.monthBudget - stats.monthSpend} workoutDoneToday={stats.workoutsToday > 0} goals={data.financialGoals} />
      <WhatsChanged items={executive.whatsChanged} />

      {/* Executive Brief (Phase 4 PRD) — Morning Brief. Decision Queue and
          Goal Progress used to live here too; Phase 5's redesign moved them
          into Needs Attention and Quick Stats above instead of duplicating
          the same information across cards. */}
      <ExecutiveBrief brief={executive.brief} />

      {/* Hero: Life Score + Module Scores */}
      <div className="bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 border border-surface-3 rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Circular Score */}
          <div className="shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-widest text-center mb-1">Life Score</p>
            <ScoreExplainer score={scores.life ?? 0} result={scoreExplanation} />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-20 bg-surface-3" />
          <div className="block lg:hidden w-full h-px bg-surface-3" />

          {/* Module Scores */}
          <div className="flex-1 w-full">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Module Scores</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {moduleScores.map(({ label, score, color, to, tip }) => (
                <Link key={to} href={to} title={tip}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-surface-2 border border-surface-3 hover:border-accent/30 hover:-translate-y-0.5 hover:shadow-lg transition-all group">
                  <MiniRing score={score} color={color} />
                  <p className="text-xs text-slate-500 group-hover:text-slate-400 text-center leading-tight">{label}</p>
                </Link>
              ))}
            </div>

            {/* Weights label */}
            <p className="text-xs text-slate-700 mt-1.5 text-center">
              Health 25% · Finance 20% · Career 20% · Learning 20% · Coding 15%
            </p>
          </div>
        </div>
      </div>

      <LifeScoreTrend scoreHistory={scoreHistory} />

      {/* My Brain group — Daily Mission, Today's Focus, and Insights are the three
          deterministic Brain outputs (Phase 2 PRD); this label brackets them as one
          conceptual group without restructuring the cards themselves. */}
      <div className="space-y-3">
        <p className="text-xs text-slate-600 uppercase tracking-widest">🧠 My Brain</p>

        {/* Daily Mission — resets to a fresh checklist every midnight, separate from the persistent Life Score above.
            Deterministic, cross-module (Planner/Health/Coding/Learning/Finance) — same primitive the Phase 2 "Brain"
            PRD calls Daily Mission; not a new feature, just this existing checklist reframed. */}
        <Card title="Daily Mission" padding="p-3.5" action={<span className="text-xs text-slate-500">{todayProgress.completed}/{todayProgress.total} done</span>}>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <MiniRing score={todayProgress.score} color="#8b5cf6" />
            </div>
            <div className="flex-1 min-w-0">
              {todayRecommendations.length > 0 ? (
                <ul className="space-y-0.5">
                  {todayRecommendations.map(r => (
                    <li key={r.text}>
                      <Link href={r.href} className="flex items-center gap-2 py-0.5 text-sm text-slate-400 hover:text-accent transition-colors">
                        <span className="shrink-0">{r.emoji}</span>
                        <span className="truncate">{r.text}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">Everything for today is done 🎉</p>
              )}
            </div>
          </div>
        </Card>

        {/* Needs Attention (Today's Focus signals + Decision Queue's Risks/
            Opportunities, capped at 3) + Today's Insight side by side. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <NeedsAttention topActions={topActions} risks={executive.risks} opportunities={executive.opportunities} />
          <TodaysInsight pattern={data.recentPatterns[0] ?? null} />
        </div>
      </div>

      <EveningReflection />

      {/* Module grid */}
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-2">Modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {modules.map(({ label, to, icon: Icon, color, bg, stat }) => (
            <Link key={to} href={to}
              className="group flex flex-col gap-2 p-3.5 bg-surface-1 border border-surface-3 rounded-xl hover:border-accent/40 hover:bg-surface-2 hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{stat}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Live data panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card title="Pending Tasks" padding="p-3.5" action={
          <Link href="/planner" className="text-xs text-accent hover:underline">View all</Link>
        }>
          {pendingTasks.length === 0 ? (
            <EmptyState icon={ListTodo} message="No pending tasks" compact />
          ) : (
            <ul className="space-y-1">
              {pendingTasks.map(task => (
                <li key={task.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-2 transition-colors">
                  <Circle size={14} className="text-slate-600 shrink-0" />
                  <p className="flex-1 text-sm text-slate-300 truncate">{task.text}</p>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Applications" padding="p-3.5" action={
          <Link href="/career" className="text-xs text-accent hover:underline">View all</Link>
        }>
          {recentApplications.length === 0 ? (
            <EmptyState icon={Briefcase} message="No applications yet" compact />
          ) : (
            <ul className="space-y-1">
              {recentApplications.map(app => (
                <li key={app.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{app.company} — {app.role}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{app.applied_at}</p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${STATUS_COLOR[app.status]}`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <BotActivityCard botActivity={botActivity} aiBudget={aiBudget} />
    </div>
  )
}
