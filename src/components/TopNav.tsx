'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, Sun, Moon, ChevronDown, MoreHorizontal,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAIAdvisorTrigger } from './AIAdvisorProvider'
import ProfileMenu from './ProfileMenu'
import pkg from '../../package.json'

// Desktop top nav — 7 items; Documents and Settings live in the profile
// dropdown instead (matching the design source, which dropped both from the
// top-level nav list).
const MODULES = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Planner', to: '/planner', icon: CalendarDays },
  { label: 'Career', to: '/career', icon: Briefcase },
  { label: 'Finance', to: '/finance', icon: DollarSign },
  { label: 'Health', to: '/health', icon: HeartPulse },
  { label: 'Learning', to: '/learning', icon: BookOpen },
  { label: 'Coding', to: '/coding', icon: Code2 },
]

// Mobile primary tabs (fixed bottom bar) — the design's 4 most-frequent
// modules get a permanent slot; everything else lives behind "More".
const MOBILE_PRIMARY = [
  { label: 'Home', to: '/dashboard', icon: '⌂' },
  { label: 'Planner', to: '/planner', icon: '📋' },
  { label: 'Health', to: '/health', icon: '🏋️' },
  { label: 'Finance', to: '/finance', icon: '💰' },
]

const MOBILE_MORE = [
  { label: 'Career', to: '/career', icon: '💼' },
  { label: 'Learning', to: '/learning', icon: '📚' },
  { label: 'Coding', to: '/coding', icon: '💻' },
  { label: 'Documents', to: '/documents', icon: '🗂️' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
]

// Desktop pill — text-only, matching the design source's nav buttons exactly.
function NavPill({ label, to, active }: { label: string; to: string; active: boolean }) {
  return (
    <Link
      href={to}
      className={`px-3 py-[7px] rounded-[7px] text-[13px] font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-surface-2 text-fg-primary' : 'text-fg-tertiary hover:text-fg-secondary'
      }`}
    >
      {label}
    </Link>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const trigger = useAIAdvisorTrigger()
  const [moreOpen, setMoreOpen] = useState(false)

  const goTo = (to: string) => { setMoreOpen(false); router.push(to) }
  const moreActive = MOBILE_MORE.some(m => m.to === pathname)

  return (
    <>
      <header
        className="sticky top-0 z-20 border-b border-surface-3 backdrop-blur-md px-5 py-3.5"
        style={{ background: 'var(--bg-translucent)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex flex-col justify-center shrink-0 leading-tight">
            <span className="text-base font-bold text-fg-primary tracking-[0.2px]">Personal OS</span>
            <span className="text-[10px] text-fg-tertiary tracking-[0.2px]">v{pkg.version}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {MODULES.map(m => (
              <NavPill key={m.to} label={m.label} to={m.to} active={pathname === m.to} />
            ))}
          </nav>
          <div className="md:hidden flex-1" />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full border border-surface-3 bg-surface-1 text-fg-secondary hover:text-fg-primary transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {trigger && (
              <button
                onClick={trigger.toggle}
                aria-label={trigger.label}
                className="flex items-center gap-1.5 px-3 py-[7px] rounded-full bg-accent-soft border border-accent-border text-accent-strong text-[12.5px] font-semibold hover:bg-accent/25 transition-colors whitespace-nowrap"
              >
                <trigger.icon size={15} />
                <span className="hidden sm:inline">{trigger.label}</span>
                <ChevronDown size={11} className={`hidden sm:inline transition-transform ${trigger.isOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — fixed bar with 4 primary tabs + "More" sheet,
          matching the design source (replaces the old horizontal pill strip). */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[58px] bg-surface-1 border-t border-surface-3 flex z-[45]">
        {MOBILE_PRIMARY.map(m => {
          const active = pathname === m.to
          return (
            <Link key={m.to} href={m.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold ${active ? 'text-accent' : 'text-fg-tertiary'}`}>
              <span className="text-[17px]">{m.icon}</span>
              {m.label}
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-semibold ${moreActive || moreOpen ? 'text-accent' : 'text-fg-tertiary'}`}
        >
          <MoreHorizontal size={17} />
          More
        </button>
      </div>
      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-[46] bg-overlay" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-[58px] left-0 right-0 z-[47] bg-surface-1 border-t border-surface-3 rounded-t-2xl p-2 shadow-popover">
            {MOBILE_MORE.map(m => {
              const active = pathname === m.to
              return (
                <button key={m.to} onClick={() => goTo(m.to)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-[11px] rounded-lg text-sm text-left ${active ? 'text-accent font-bold' : 'text-fg-primary font-normal'}`}
                >
                  <span>{m.icon}</span>{m.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
