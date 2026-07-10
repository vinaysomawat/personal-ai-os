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
} from 'lucide-react'
import UserInfo from './UserInfo'
import pkg from '../../package.json'

const topLevel = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
]

// Growth Engine pillars, per PRD-v2: every feature maps to Learn/Build/Perform/Recover.
// Finance and Documents don't map to a pillar in the PRD — kept ungrouped below.
const pillars = [
  { name: 'Learn',    items: [{ label: 'Learning', to: '/learning', icon: BookOpen }] },
  { name: 'Build',    items: [{ label: 'Coding', to: '/coding', icon: Code2 }] },
  { name: 'Perform',  items: [{ label: 'Planner', to: '/planner', icon: CalendarDays }, { label: 'Career', to: '/career', icon: Briefcase }] },
  { name: 'Recover',  items: [{ label: 'Health', to: '/health', icon: HeartPulse }] },
]

const ungrouped = [
  { label: 'Finance', to: '/finance', icon: DollarSign },
  { label: 'Documents', to: '/documents', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-surface-1 border-r border-surface-3">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent">
          <Cpu size={15} className="text-white" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-white">Vinay AI OS</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {topLevel.map(({ label, to, icon: Icon }) => {
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

        {pillars.map(pillar => (
          <div key={pillar.name} className="pt-3">
            <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">{pillar.name}</p>
            {pillar.items.map(({ label, to, icon: Icon }) => {
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
          </div>
        ))}

        <div className="pt-3">
          {ungrouped.map(({ label, to, icon: Icon }) => {
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
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-surface-3 space-y-2">
        <UserInfo />
        <p className="text-xs text-slate-700 font-mono px-1">v{pkg.version}</p>
      </div>
    </aside>
  )
}
