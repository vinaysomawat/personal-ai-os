'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  Briefcase,
  DollarSign,
  HeartPulse,
  BookOpen,
  Code2,
  FileText,
  LayoutDashboard,
  Cpu,
  Sparkles,
} from 'lucide-react'
import UserInfo from './UserInfo'

const nav = [
  { label: 'Dashboard',       to: '/dashboard',       icon: LayoutDashboard },
  { label: 'Recommendations', to: '/recommendations', icon: Sparkles },
  { label: 'Planner',         to: '/planner',         icon: CalendarDays },
  { label: 'Career', to: '/career', icon: Briefcase },
  { label: 'Finance', to: '/finance', icon: DollarSign },
  { label: 'Health', to: '/health', icon: HeartPulse },
  { label: 'Learning', to: '/learning', icon: BookOpen },
  { label: 'Coding', to: '/coding', icon: Code2 },
  { label: 'Documents', to: '/documents', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-surface-1 border-r border-surface-3">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent">
          <Cpu size={15} className="text-white" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-white">Vinay AI OS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ label, to, icon: Icon }) => {
          const isActive = pathname === to
          return (
            <Link
              key={to}
              href={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-slate-400 hover:bg-surface-2 hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-surface-3 space-y-2">
        <UserInfo />
        <p className="text-xs text-slate-700 font-mono px-1">v0.1.0</p>
      </div>
    </aside>
  )
}
