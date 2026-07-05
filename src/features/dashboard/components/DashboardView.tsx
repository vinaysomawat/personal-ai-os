import Link from 'next/link'
import {
  CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText, Circle, Bot, Lightbulb,
} from 'lucide-react'
import Card from '@/components/Card'
import ScoreHero from './ScoreHero'
import { formatDistanceToNow } from 'date-fns'
import type { getDashboardData } from '../actions'

const MODULE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  planner:   { label: 'Planner',   emoji: '📋', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  career:    { label: 'Career',    emoji: '💼', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  finance:   { label: 'Finance',   emoji: '💸', color: 'text-green-400',  bg: 'bg-green-500/10' },
  health:    { label: 'Health',    emoji: '💪', color: 'text-red-400',    bg: 'bg-red-500/10' },
  learning:  { label: 'Learning',  emoji: '📚', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  coding:    { label: 'Coding',    emoji: '💻', color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  projects:  { label: 'Projects',  emoji: '💻', color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  documents: { label: 'Documents', emoji: '📄', color: 'text-orange-400', bg: 'bg-orange-500/10' },
}

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

  if (stats.totalHabits > 0) {
    const rem = stats.totalHabits - stats.habitsDoneToday
    items.push(rem === 0
      ? `All ${stats.totalHabits} habits done today`
      : `${stats.habitsDoneToday}/${stats.totalHabits} habits done — ${rem} remaining`)
  }

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
  const { pendingTasks, recentApplications, botActivity, stats, scores, todayHealth } = data
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const insights = computeInsights(stats, scores, todayHealth)

  const moduleScores = [
    { label: 'Health',   score: scores.health,            color: '#ef4444', to: '/health' },
    { label: 'Finance',  score: scores.finance,           color: '#22c55e', to: '/finance' },
    { label: 'Career',   score: scores.career,            color: '#f59e0b', to: '/career' },
    { label: 'Learning', score: scores.learning,          color: '#a855f7', to: '/learning' },
    { label: 'Projects', score: scores.projects ?? 0,     color: '#06b6d4', to: '/coding' },
  ]

  const modules = [
    { label: 'Planner',   to: '/planner',   icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-500/10',   stat: stats.pendingTaskCount ? `${stats.pendingTaskCount} pending` : 'All clear' },
    { label: 'Career',    to: '/career',    icon: Briefcase,    color: 'text-amber-400',  bg: 'bg-amber-500/10',  stat: stats.activeApplications ? `${stats.activeApplications} active` : 'No applications' },
    { label: 'Health',    to: '/health',    icon: HeartPulse,   color: 'text-red-400',    bg: 'bg-red-500/10',    stat: todayHealth?.steps ? `${(Number(todayHealth.steps)/1000).toFixed(1)}k steps` : `${stats.habitsDoneToday}/${stats.totalHabits} habits` },
    { label: 'Finance',   to: '/finance',   icon: DollarSign,   color: 'text-green-400',  bg: 'bg-green-500/10',  stat: stats.monthSpend ? `₹${Math.round(stats.monthSpend).toLocaleString('en-IN')} spent` : 'No expenses' },
    { label: 'Learning',  to: '/learning',  icon: BookOpen,     color: 'text-purple-400', bg: 'bg-purple-500/10', stat: stats.learningInProgress ? `${stats.learningInProgress} in progress` : 'No resources' },
    { label: 'Coding',    to: '/coding',    icon: Code2,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   stat: stats.activeProjects ? `${stats.activeProjects} active` : 'No projects' },
    { label: 'Documents', to: '/documents', icon: FileText,     color: 'text-orange-400', bg: 'bg-orange-500/10', stat: stats.documentCount ? `${stats.documentCount} doc${stats.documentCount !== 1 ? 's' : ''}` : 'Empty' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">{today}</p>
        <h2 className="text-2xl font-bold text-white">{greeting}, Vinay</h2>
        <p className="text-sm text-slate-500 mt-1">Here&apos;s your Life Intelligence Dashboard</p>
      </div>

      {/* Hero: Life Score + Module Scores */}
      <div className="bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 border border-surface-3 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Circular Score */}
          <div className="shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-widest text-center mb-3">Life Score</p>
            <ScoreHero score={scores.life ?? 0} />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-40 bg-surface-3" />
          <div className="block lg:hidden w-full h-px bg-surface-3" />

          {/* Module Scores */}
          <div className="flex-1 w-full">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Module Scores</p>
            <div className="grid grid-cols-5 gap-2">
              {moduleScores.map(({ label, score, color, to }) => (
                <Link key={to} href={to}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-2 border border-surface-3 hover:border-accent/30 transition-colors group">
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
            <p className="text-xs text-slate-700 mt-3 text-center">
              Health 25% · Finance 20% · Career 20% · Learning 20% · Projects 15%
            </p>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card title="Insights" action={
          <Lightbulb size={13} className="text-amber-400" />
        }>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-center gap-3 py-2 border-b border-surface-3 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0" />
                <p className="text-sm text-slate-400">{insight}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Module grid */}
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">Modules</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {modules.map(({ label, to, icon: Icon, color, bg, stat }) => (
            <Link key={to} href={to}
              className="group flex flex-col gap-3 p-4 bg-surface-1 border border-surface-3 rounded-xl hover:border-accent/40 hover:bg-surface-2 transition-all">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat}</p>
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
            <p className="text-sm text-slate-600 text-center py-6">No pending tasks</p>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map(task => (
                <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors">
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
            <p className="text-sm text-slate-600 text-center py-6">No applications yet</p>
          ) : (
            <ul className="space-y-2">
              {recentApplications.map(app => (
                <li key={app.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors">
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

      {/* Bot Activity */}
      <Card title="Bot Activity" action={
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Bot size={12} /><span>Telegram</span>
        </div>
      }>
        {!botActivity || botActivity.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Bot size={24} className="mx-auto text-slate-700" />
            <p className="text-sm text-slate-600">No bot activity yet</p>
            <p className="text-xs text-slate-700">Send a message to any Telegram bot and it will appear here</p>
          </div>
        ) : (
          <ul className="space-y-px">
            {botActivity.map((entry, i) => {
              const meta = MODULE_META[entry.module] ?? { label: entry.module, emoji: '🤖', color: 'text-slate-400', bg: 'bg-slate-500/10' }
              const firstLine = entry.response?.split('\n')[0]?.replace(/\*/g, '') ?? ''
              const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
              return (
                <li key={i} className="flex items-start gap-3 py-3 border-b border-surface-3 last:border-0">
                  <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5 text-sm`}>
                    {meta.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-slate-700">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">&ldquo;{entry.message}&rdquo;</p>
                    {firstLine && <p className="text-xs text-slate-500 mt-0.5 truncate">{firstLine}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
