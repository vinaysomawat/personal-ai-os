import Link from 'next/link'
import {
  CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText, Circle, Sparkles, Bot,
} from 'lucide-react'
import Card from '@/components/Card'
import { formatDistanceToNow } from 'date-fns'
import type { getDashboardData } from '../actions'

const MODULE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  planner:   { label: 'Planner',   emoji: '📋', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  career:    { label: 'Career',    emoji: '💼', color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  finance:   { label: 'Finance',   emoji: '💸', color: 'text-green-400',  bg: 'bg-green-500/10' },
  health:    { label: 'Health',    emoji: '💪', color: 'text-red-400',    bg: 'bg-red-500/10' },
  learning:  { label: 'Learning',  emoji: '📚', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  coding:    { label: 'Coding',    emoji: '💻', color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  documents: { label: 'Documents', emoji: '📄', color: 'text-orange-400', bg: 'bg-orange-500/10' },
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-500',
}

const STATUS_COLOR: Record<string, string> = {
  applied:   'text-blue-400',
  screening: 'text-amber-400',
  interview: 'text-purple-400',
  offer:     'text-green-400',
  rejected:  'text-red-400',
}

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

export default function DashboardView({ data, briefing }: { data: DashboardData; briefing?: string }) {
  const { pendingTasks, recentApplications, botActivity, stats } = data
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const modules = [
    { label: 'Planner',   to: '/planner',   icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-500/10',   stat: stats.pendingTaskCount ? `${stats.pendingTaskCount} pending` : 'All clear' },
    { label: 'Career',    to: '/career',    icon: Briefcase,    color: 'text-amber-400',  bg: 'bg-amber-500/10',  stat: stats.activeApplications ? `${stats.activeApplications} active` : 'No applications' },
    { label: 'Health',    to: '/health',    icon: HeartPulse,   color: 'text-red-400',    bg: 'bg-red-500/10',    stat: stats.totalHabits ? `${stats.habitsDoneToday}/${stats.totalHabits} today` : 'No habits yet' },
    { label: 'Finance',   to: '/finance',   icon: DollarSign,   color: 'text-green-400',  bg: 'bg-green-500/10',  stat: stats.monthSpend ? `₹${Math.round(stats.monthSpend).toLocaleString('en-IN')} this month` : 'No expenses yet' },
    { label: 'Learning',  to: '/learning',  icon: BookOpen,     color: 'text-purple-400', bg: 'bg-purple-500/10', stat: stats.learningInProgress ? `${stats.learningInProgress} in progress` : 'No resources yet' },
    { label: 'Coding',    to: '/coding',    icon: Code2,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   stat: stats.activeProjects ? `${stats.activeProjects} active` : 'No projects yet' },
    { label: 'Documents', to: '/documents', icon: FileText,     color: 'text-orange-400', bg: 'bg-orange-500/10', stat: stats.documentCount ? `${stats.documentCount} doc${stats.documentCount !== 1 ? 's' : ''}` : 'Empty' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">{today}</p>
        <h2 className="text-2xl font-bold text-white">{greeting}, Vinay</h2>
      </div>

      {/* AI Daily Briefing */}
      {briefing && (
        <div className="relative bg-gradient-to-br from-accent/10 to-purple-500/5 border border-accent/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-widest">AI Briefing</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{briefing}</p>
        </div>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map(({ label, to, icon: Icon, color, bg, stat }) => (
          <Link
            key={to}
            href={to}
            className="group flex flex-col gap-3 p-4 bg-surface-1 border border-surface-3 rounded-xl hover:border-accent/40 hover:bg-surface-2 transition-all"
          >
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

      {/* Bot Activity Log */}
      <Card
        title="Bot Activity"
        action={
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Bot size={12} />
            <span>Telegram</span>
          </div>
        }
      >
        {!botActivity || botActivity.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Bot size={24} className="mx-auto text-slate-700" />
            <p className="text-sm text-slate-600">No bot activity yet</p>
            <p className="text-xs text-slate-700">Send a message to any of your Telegram bots and it will appear here</p>
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
                    <p className="text-sm text-slate-300 truncate">"{entry.message}"</p>
                    {firstLine && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{firstLine}</p>
                    )}
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
