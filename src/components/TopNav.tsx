'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Briefcase, DollarSign, HeartPulse,
  BookOpen, Code2, FileText, Settings, Cpu, Sun, Moon, ChevronDown,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAIAdvisorTrigger } from './AIAdvisorProvider'
import ProfileMenu from './ProfileMenu'

// Flat module list — the mockup's top nav doesn't carry the Sidebar's pillar
// grouping, just one row of pills in a fixed order.
const MODULES = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Planner', to: '/planner', icon: CalendarDays },
  { label: 'Career', to: '/career', icon: Briefcase },
  { label: 'Finance', to: '/finance', icon: DollarSign },
  { label: 'Health', to: '/health', icon: HeartPulse },
  { label: 'Learning', to: '/learning', icon: BookOpen },
  { label: 'Coding', to: '/coding', icon: Code2 },
  { label: 'Documents', to: '/documents', icon: FileText },
]

// Desktop pill — text-only, matching the design source's nav buttons exactly.
function NavPill({ label, to, active }: { label: string; to: string; active: boolean }) {
  return (
    <Link
      href={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-surface-2 text-fg-primary' : 'text-fg-tertiary hover:text-fg-secondary'
      }`}
    >
      {label}
    </Link>
  )
}

// Mobile pill — icon+label, since this strip fully replaces BottomNav (whose
// items were always icon+label) rather than just mirroring the desktop pill.
function MobilePill({ label, to, icon: Icon, active }: { label: string; to: string; icon: typeof LayoutDashboard; active: boolean }) {
  return (
    <Link
      href={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
        active ? 'bg-surface-2 text-fg-primary' : 'text-fg-tertiary hover:text-fg-secondary'
      }`}
    >
      <Icon size={13} className="shrink-0" />
      {label}
    </Link>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const trigger = useAIAdvisorTrigger()

  return (
    <header
      className="sticky top-0 z-30 border-b border-surface-3 backdrop-blur-md"
      style={{ background: 'var(--bg-translucent)' }}
    >
      <div className="flex items-center gap-3 px-4 md:px-5 h-12">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-accent">
            <Cpu size={13} className="text-white" />
          </span>
          <span className="hidden sm:inline text-sm font-semibold text-fg-primary tracking-wide">Personal OS</span>
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
            className="flex items-center justify-center w-8 h-8 rounded-full border border-surface-3 bg-surface-1 text-fg-secondary hover:text-fg-primary transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link
            href="/settings"
            title="Settings"
            className={`flex items-center justify-center w-8 h-8 rounded-full border bg-surface-1 transition-colors ${pathname === '/settings' ? 'border-accent text-accent' : 'border-surface-3 text-fg-secondary hover:text-fg-primary'}`}
          >
            <Settings size={15} />
          </Link>
          {trigger && (
            <button
              onClick={trigger.toggle}
              aria-label={trigger.label}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-accent-soft border border-accent-border text-accent-strong text-xs font-semibold hover:bg-accent/25 transition-colors whitespace-nowrap"
            >
              <trigger.icon size={13} />
              <span className="hidden sm:inline">{trigger.label}</span>
              <ChevronDown size={11} className={`hidden sm:inline transition-transform ${trigger.isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
          <ProfileMenu />
        </div>
      </div>

      {/* Mobile module strip — replaces BottomNav entirely; every module is
          one tap away instead of 5-direct + "More" sheet. */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
        {MODULES.map(m => (
          <MobilePill key={m.to} {...m} active={pathname === m.to} />
        ))}
      </nav>
    </header>
  )
}
