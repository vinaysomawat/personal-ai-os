import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Briefcase,
  DollarSign,
  HeartPulse,
  BookOpen,
  Code2,
  FileText,
  TrendingUp,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import Card from '../components/Card'

const modules = [
  { label: 'Planner', to: '/planner', icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/10', stat: '3 tasks today' },
  { label: 'Career', to: '/career', icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10', stat: '2 applications' },
  { label: 'Finance', to: '/finance', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', stat: 'On track' },
  { label: 'Health', to: '/health', icon: HeartPulse, color: 'text-red-400', bg: 'bg-red-500/10', stat: '7-day streak' },
  { label: 'Learning', to: '/learning', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10', stat: '2 courses active' },
  { label: 'Coding', to: '/coding', icon: Code2, color: 'text-cyan-400', bg: 'bg-cyan-500/10', stat: '4 projects' },
  { label: 'Documents', to: '/documents', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10', stat: '12 files' },
]

const recentActivity = [
  { icon: CheckCircle2, text: 'Completed "LeetCode 150" session', time: '2h ago', color: 'text-green-400' },
  { icon: TrendingUp, text: 'Updated monthly budget', time: '5h ago', color: 'text-blue-400' },
  { icon: Zap, text: 'Started new React project', time: 'Yesterday', color: 'text-accent' },
  { icon: CheckCircle2, text: 'Morning workout logged', time: 'Yesterday', color: 'text-green-400' },
]

export default function Dashboard() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-1">{today}</p>
        <h2 className="text-2xl font-bold text-white">Good morning, Vinay</h2>
        <p className="text-slate-400 text-sm mt-1">Your AI OS is tracking 7 areas of your life.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map(({ label, to, icon: Icon, color, bg, stat }) => (
          <Link
            key={to}
            to={to}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Recent Activity">
          <ul className="space-y-3">
            {recentActivity.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <item.icon size={15} className={`mt-0.5 shrink-0 ${item.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 leading-snug">{item.text}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Decisions to make">
          <ul className="space-y-2">
            {[
              'Should I apply for the Senior Engineer role at Stripe?',
              'Increase emergency fund or invest in index funds?',
              'Which React course should I finish first?',
            ].map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
              >
                <span className="text-accent font-mono text-xs mt-0.5 shrink-0">Q{i + 1}</span>
                <p className="text-sm text-slate-300 leading-snug">{q}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
