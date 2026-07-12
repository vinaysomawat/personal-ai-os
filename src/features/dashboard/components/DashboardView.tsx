import Link from 'next/link'
import {
  CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText, Circle, Lightbulb, Target,
} from 'lucide-react'
import Card from '@/components/Card'
import ScoreHero from './ScoreHero'
import RealtimeRefresh from './RealtimeRefresh'
import BotActivityCard from './BotActivityCard'
import type { getDashboardData } from '../actions'

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-500',
}

const STATUS_COLOR: Record<string, string> = {
  applied: 'text-blue-400', screening: 'text-amber-400',
  interview: 'text-purple-400', offer: 'text-green-400', rejected: 'text-red-400',
}

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

function MiniRing({ score, color }: { score: number; color: string }) {
  const r = 16, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="#26263a" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" />
    </svg>
  )
}

function computeInsights(
  stats: DashboardData['stats'],
  scores: DashboardData['scores'],
  todayHealth: DashboardData['todayHealth'],
): string[] {
  const items: string[] = []

  if ((stats.monthBudget ?? 0) > 0) {
    const rem = (stats.monthBudget ?? 0) - stats.monthSpend
    const fmt = (n: number) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`
    items.push(rem >= 0
      ? `${fmt(rem)} left in budget this month`
      : `${fmt(rem)} over budget this month`)
  }

  if (todayHealth?.sleep_hours && Number(todayHealth.sleep_hours) < 7) {
    items.push(`Slept ${todayHealth.sleep_hours}h last night — aim for 7–8h`)
  }

  if (stats.activeApplications > 0) {
    items.push(`${stats.activeApplications} job application${stats.activeApplications > 1 ? 's' : ''} in the pipeline`)
  }

  if (stats.pendingTaskCount > 0) {
    items.push(`${stats.pendingTaskCount} task${stats.pendingTaskCount > 1 ? 's' : ''} pending in Planner`)
  }

  if (stats.learningInProgress > 0) {
    items.push(`${stats.learningInProgress} learning resource${stats.learningInProgress > 1 ? 's' : ''} in progress`)
  }

  if (scores.health < 40 && !todayHealth?.steps) {
    items.push('Log your steps and water today to boost Health Score')
  }

  return items.slice(0, 5)
}

export default function DashboardView({ data }: { data: DashboardData }) {
  const { pendingTasks, recentApplications, botActivity, stats, scores, scoreTips, todayHealth, aiBudget, topActions } = data
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const insights = computeInsights(stats, scores, todayHealth)

  const moduleScores = [
    { label: 'Health',   score: scores.health,            color: '#ef4444', to: '/health',   tip: scoreTips.health },
    { label: 'Finance',  score: scores.finance,           color: '#22c55e', to: '/finance',  tip: scoreTips.finance },
    { label: 'Career',   score: scores.career,            color: '#f59e0b', to: '/career',   tip: scoreTips.career },
    { label: 'Learning', score: scores.learning,          color: '#a855f7', to: '/learning', tip: scoreTips.learning },
    { label: 'Coding',   score: scores.projects ?? 0,     color: '#06b6d4', to: '/coding',   tip: scoreTips.projects },
  ]

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
      {/* Header */}
      <div className="flex items-baseline justify-between flex-wrap gap-1">
        <div>
          <h2 className="text-2xl font-bold text-white">{greeting}, Vinay</h2>
          <p className="text-xs text-slate-500 mt-0.5">Here&apos;s your Life Intelligence Dashboard</p>
        </div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{today}</p>
      </div>

      {/* Hero: Life Score + Module Scores */}
      <div className="bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 border border-surface-3 rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Circular Score */}
          <div className="shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-widest text-center mb-1">Life Score</p>
            <ScoreHero score={scores.life ?? 0} />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-20 bg-surface-3" />
          <div className="block lg:hidden w-full h-px bg-surface-3" />

          {/* Module Scores */}
          <div className="flex-1 w-full">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Module Scores</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {moduleScores.map(({ label, score, color, to, tip }) => (
                <Link key={to} href={to} title={tip}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-surface-2 border border-surface-3 hover:border-accent/30 transition-colors group">
                  <div className="relative">
                    <MiniRing score={score} color={color} />
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums"
                      style={{ color }}>
                      {score}
                    </span>
                  </div>
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

      {/* Today's Focus + Insights side by side — both are short scannable lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Today's Focus" padding="p-3.5" action={<Target size={13} className="text-accent" />}>
          {topActions.length > 0 ? (
            <ul className="space-y-0.5">
              {topActions.map((action, i) => (
                <li key={i}>
                  <Link href={action.href} className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors group">
                    <span className="text-lg shrink-0">{action.emoji}</span>
                    <p className="text-sm text-slate-300 flex-1">{action.text}</p>
                    <span className="text-xs text-slate-600 group-hover:text-accent transition-colors">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">Nothing urgent — you&apos;re on top of everything 🎉</p>
            </div>
          )}
        </Card>

        <Card title="Insights" action={<Lightbulb size={13} className="text-amber-400" />}>
          {insights.length > 0 ? (
            <ul className="space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-center gap-3 py-1 border-b border-surface-3 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0" />
                  <p className="text-sm text-slate-400">{insight}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">Nothing to flag right now</p>
            </div>
          )}
        </Card>
      </div>

      {/* Module grid */}
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-2">Modules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {modules.map(({ label, to, icon: Icon, color, bg, stat }) => (
            <Link key={to} href={to}
              className="group flex flex-col gap-2 p-3 bg-surface-1 border border-surface-3 rounded-xl hover:border-accent/40 hover:bg-surface-2 transition-all">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Pending Tasks" action={
          <Link href="/planner" className="text-xs text-accent hover:underline">View all</Link>
        }>
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">No pending tasks</p>
          ) : (
            <ul className="space-y-1">
              {pendingTasks.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
                  <Circle size={14} className="text-slate-600 shrink-0" />
                  <p className="flex-1 text-sm text-slate-300 truncate">{task.text}</p>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Applications" action={
          <Link href="/career" className="text-xs text-accent hover:underline">View all</Link>
        }>
          {recentApplications.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-4">No applications yet</p>
          ) : (
            <ul className="space-y-1">
              {recentApplications.map(app => (
                <li key={app.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
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
