'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  HeartPulse,
  DollarSign,
  Search,
  MoreHorizontal,
  Sparkles,
  Briefcase,
  BookOpen,
  Code2,
  FileText,
} from 'lucide-react'

const primaryNav = [
  { label: 'Home',    to: '/dashboard', icon: LayoutDashboard },
  { label: 'Planner', to: '/planner',   icon: CalendarDays },
  { label: 'Health',  to: '/health',    icon: HeartPulse },
  { label: 'Finance', to: '/finance',   icon: DollarSign },
  { label: 'Search',  to: '/search',    icon: Search },
]

const moreNav = [
  { label: 'Recommendations', to: '/recommendations', icon: Sparkles },
  { label: 'Career',          to: '/career',          icon: Briefcase },
  { label: 'Learning',        to: '/learning',         icon: BookOpen },
  { label: 'Coding',          to: '/coding',           icon: Code2 },
  { label: 'Documents',       to: '/documents',        icon: FileText },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const moreActive = moreNav.some(({ to }) => to === pathname)

  return (
    <>
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMore(false)}
          />
          <div className="relative z-10 bg-surface-1 border-t border-surface-3 rounded-t-2xl pb-20 pt-2">
            <div className="mx-auto mt-1 mb-2 h-1 w-10 rounded-full bg-surface-3" />
            {moreNav.map(({ label, to, icon: Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  href={to}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                    active ? 'text-accent' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-1 border-t border-surface-3 flex">
        {primaryNav.map(({ label, to, icon: Icon }) => {
          const active = pathname === to
          return (
            <Link key={to} href={to}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${active ? 'text-accent' : 'text-slate-600 hover:text-slate-400'}`}>
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${moreActive ? 'text-accent' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </>
  )
}
