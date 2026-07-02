import Link from 'next/link'
import {
  CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText, Circle, ExternalLink,
} from 'lucide-react'
import Card from '@/components/Card'
import type { getDashboardData } from '../actions'

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

export default function DashboardView({ data }: { data: DashboardData }) {
  const { pendingTasks, recentApplications, stats } = data
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const modules = [
    { label: 'Planner',   to: '/planner',   icon: CalendarDays, color: 'text-blue-400',   bg: 'bg-blue-500/10',   stat: stats.pendingTaskCount ? `${stats.pendingTaskCount} pending` : 'All clear' },
    { label: 'Career',    to: '/career',    icon: Briefcase,    color: 'text-amber-400',  bg: 'bg-amber-500/10',  stat: stats.activeApplications ? `${stats.activeApplications} active` : 'No applications' },
    { label: 'Health',    to: '/health',    icon: HeartPulse,   color: 'text-red-400',    bg: 'bg-red-500/10',    stat: stats.totalHabits ? `${stats.habitsDoneToday}/${stats.totalHabits} today` : 'No habits yet' },
    { label: 'Finance',   to: '/finance',   icon: DollarSign,   color: 'text-green-400',  bg: 'bg-green-500/10',  stat: 'Coming soon' },
    { label: 'Learning',  to: '/learning',  icon: BookOpen,     color: 'text-purple-400', bg: 'bg-purple-500/10', stat: 'Coming soon' },
    { label: 'Coding',    to: '/coding',    icon: Code2,        color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   stat: 'Coming soon' },
    { label: 'Documents', to: '/documents', icon: FileText,     color: 'text-orange-400', bg: 'bg-orange-500/10', stat: 'Coming soon' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">{today}</p>
        <h2 className="text-2xl font-bold text-white">{greeting}, Vinay</h2>
        <p className="text-slate-400 text-sm mt-1">
          {stats.pendingTaskCount > 0
            ? `You have ${stats.pendingTaskCount} pending task${stats.pendingTaskCount > 1 ? 's' : ''} and ${stats.activeApplications} active application${stats.activeApplications !== 1 ? 's' : ''}.`
            : 'All tasks done. Nice work.'}
        </p>
      </div>

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
        {/* Pending tasks */}
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

        {/* Recent applications */}
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
    </div>
  )
}
