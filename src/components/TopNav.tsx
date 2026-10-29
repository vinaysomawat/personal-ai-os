'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, DollarSign, HeartPulse,
  Sun, Moon, ChevronDown, MoreHorizontal, Target,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAIAdvisorTrigger } from './AIAdvisorProvider'
import ProfileMenu from './ProfileMenu'
import pkg from '../../package.json'
import { getNavBadges } from '@/lib/nav-badges'

// Desktop top nav — 7 items (Planner removed 2026-10-07); Settings lives in the profile dropdown instead
// (matching the design source, which dropped it from the top-level nav list).
// Astrology also lives in the profile dropdown (2026-08-13 design decision)
// rather than as a peer module pill — it's a different category
// (mystical/lifestyle) from the productivity modules the top row is for.
const MODULES = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  // v2.0: Prep — the daily interview-prep session hub.
  { label: 'Prep', to: '/prep', icon: Target },
  { label: 'Finance', to: '/finance', icon: DollarSign },
  { label: 'Health', to: '/health', icon: HeartPulse },
]

// Mobile primary tabs (floating pill bar) — the 4 most-frequent modules get
// a permanent slot; everything else lives behind "More".
const MOBILE_PRIMARY: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Home', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Prep', to: '/prep', icon: Target },
  { label: 'Health', to: '/health', icon: HeartPulse },
  { label: 'Finance', to: '/finance', icon: DollarSign },
]

const MOBILE_MORE = [
  { label: 'Astrology', to: '/astrology', icon: '🔮' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
]

// Red count badge (iOS style) — nav pills and the mobile tab bar.
function Badge({ n, className = '' }: { n?: number; className?: string }) {
  if (!n) return null
  return <span className={`min-w-[16px] h-[16px] px-[4px] rounded-full bg-[#ff3b30] text-white text-[10px] font-bold leading-[16px] text-center tabular-nums ${className}`}>{n > 99 ? '99+' : n}</span>
}

// Desktop pill — text-only; the active page is filled with the accent.
function NavPill({ label, to, active, badge }: { label: string; to: string; active: boolean; badge?: number }) {
  return (
    <Link
      href={to}
      className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-[7px] text-[13px] font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-accent text-white' : 'text-fg-primary hover:bg-surface-2'
      }`}
    >
      {label}
      <Badge n={badge} />
    </Link>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const trigger = useAIAdvisorTrigger()
  const [moreOpen, setMoreOpen] = useState(false)
  // Badge counts, re-read on each page change (the work may have changed them).
  const [badges, setBadges] = useState<Record<string, number>>({})
  useEffect(() => {
    if (pathname === '/login') return
    getNavBadges().then(setBadges).catch(() => {})
  }, [pathname])

  const goTo = (to: string) => { setMoreOpen(false); router.push(to) }
  const moreActive = MOBILE_MORE.some(m => m.to === pathname)

  return (
    <>
      <header
        className="sticky top-0 z-20 border-b border-surface-3 backdrop-blur-xl px-4 h-[44px] flex items-center"
        style={{ background: 'var(--bg-translucent)' }}
      >
        <div className="flex items-center gap-4 w-full">
          <Link href="/dashboard" className="shrink-0 text-[15px] font-bold text-fg-primary tracking-[-0.01em]">Personal OS</Link>
          <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {MODULES.map(m => (
              <NavPill key={m.to} label={m.label} to={m.to} active={pathname === m.to} badge={badges[m.to]} />
            ))}
          </nav>
          <div className="md:hidden flex-1" />

          <div className="flex items-center gap-1.5 shrink-0">
            {trigger && (
              <button
                onClick={trigger.toggle}
                aria-label={trigger.label}
                className="flex items-center gap-1 px-2 py-[3px] rounded-[6px] border border-border-strong text-fg-secondary text-[12px] font-medium hover:text-accent hover:border-accent transition-colors whitespace-nowrap"
              >
                <trigger.icon size={13} />
                <span className="hidden sm:inline">{trigger.label}</span>
                <ChevronDown size={11} className={`hidden sm:inline transition-transform ${trigger.isOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex items-center justify-center w-[28px] h-[28px] rounded-full text-fg-tertiary hover:text-fg-primary hover:bg-surface-2 transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link href="/changelog" className="hidden sm:inline text-[11px] text-fg-tertiary tabular-nums hover:text-accent transition-colors">v{pkg.version}</Link>
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Mobile tab bar — a floating pill (iOS style) with 4 primary tabs, badges
          and a "More" sheet. */}
      <div className="md:hidden fixed bottom-2.5 left-3 right-3 h-[58px] rounded-full border border-surface-3 backdrop-blur-xl shadow-popover flex items-center px-1.5 z-[45]"
        style={{ background: 'var(--bg-translucent)' }}>
        {MOBILE_PRIMARY.map(m => {
          const active = pathname === m.to
          return (
            <Link key={m.to} href={m.to}
              className={`relative flex-1 h-[48px] rounded-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${active ? 'bg-surface-2 text-accent' : 'text-fg-secondary'}`}>
              <m.icon size={19} strokeWidth={active ? 2.3 : 1.9} />
              {m.label}
              <Badge n={badges[m.to]} className="absolute top-0.5 left-1/2 ml-1.5" />
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`flex-1 h-[48px] rounded-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${moreActive || moreOpen ? 'bg-surface-2 text-accent' : 'text-fg-secondary'}`}
        >
          <MoreHorizontal size={19} />
          More
        </button>
      </div>
      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-[46] bg-overlay" onClick={() => setMoreOpen(false)} />
          <div className="md:hidden fixed bottom-[76px] left-3 right-3 z-[47] bg-surface-1 border border-surface-3 rounded-2xl p-1.5 shadow-popover">
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
