'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'

interface AIAdvisorContextValue {
  label: string | null
  icon: LucideIcon | null
  isOpen: boolean
  toggle: () => void
  registerTrigger: (label: string, icon: LucideIcon, widthPx?: number) => void
  unregisterTrigger: () => void
  panelBody: HTMLDivElement | null
  widthPx: number
}

const AIAdvisorContext = createContext<AIAdvisorContextValue | null>(null)

const DEFAULT_PANEL_WIDTH = 400

// Header.tsx can't read a page's local state directly (separate component in
// the layout tree), so each module's View registers a trigger (label/icon)
// here and portals its advisor content directly into the panel body DOM node
// — content never round-trips through Context state, so typing/interacting
// inside the panel only re-renders the View itself, not this Provider.
export function AIAdvisorProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null)
  const [icon, setIcon] = useState<LucideIcon | null>(null)
  const [widthPx, setWidthPx] = useState(DEFAULT_PANEL_WIDTH)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [panelBody, setPanelBody] = useState<HTMLDivElement | null>(null)

  useEffect(() => { setPanelBody(bodyRef.current) }, [])
  useEffect(() => { setIsOpen(false) }, [pathname])

  // widthPx defaults to 400 (design's width for the 5 generic module
  // advisors); Ask Brain's design specifies 440px, passed explicitly by
  // BrainAdvisorTrigger — a per-instance override, not a fork of this file.
  const registerTrigger = (l: string, i: LucideIcon, w: number = DEFAULT_PANEL_WIDTH) => { setLabel(l); setIcon(i); setWidthPx(w) }
  const unregisterTrigger = () => { setLabel(null); setIcon(null) }

  const Icon = icon

  return (
    <AIAdvisorContext.Provider value={{ label, icon, isOpen, toggle: () => setIsOpen(v => !v), registerTrigger, unregisterTrigger, panelBody, widthPx }}>
      {children}
      {/* Always mounted (never conditionally rendered on `label`) so bodyRef
          attaches on Provider's first render — otherwise the ref never
          captures a node and panelBody stays null forever. Visibility is
          purely CSS-driven instead.
          Design specifies every module advisor (Career Mentor, Money Advisor,
          Health Coach, Study Coach, Code Mentor) as a full-height right-side
          drawer — `top:0 right:0 bottom:0 width:min(400px,100vw)` — not a
          small top-right dropdown. Matches the same drawer pattern already
          used for Ask Brain and Executive Summary. Ask Brain's own design
          calls for 440px instead of 400px — widthPx (see registerTrigger)
          carries that per-instance override without forking this component. */}
      <div
        className={`fixed inset-0 z-40 bg-overlay ${isOpen && label ? '' : 'hidden'}`}
        onClick={() => setIsOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 z-[60] bg-surface-1 border-l border-surface-3 flex flex-col animate-in fade-in duration-[180ms] ease-out ${isOpen && label ? '' : 'hidden'}`}
        style={{ width: `min(${widthPx}px, 100vw)` }}
      >
        <div className="flex items-center justify-between p-[var(--card-pad-lg)] border-b border-surface-3 shrink-0">
          <span className="text-[14px] font-bold text-fg-primary flex items-center gap-2">
            {Icon && <Icon size={15} className="text-accent" />}
            {label}
          </span>
          <button onClick={() => setIsOpen(false)} aria-label="Close AI advisor panel" className="text-fg-tertiary hover:text-fg-secondary text-base leading-none transition-colors">
            ✕
          </button>
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto p-[var(--card-pad-lg)]" />
      </div>
    </AIAdvisorContext.Provider>
  )
}

// Cheap, no registration — safe to call just to read whether this page's
// panel is currently open (e.g. to decide whether to lazy-fetch content).
export function useAIAdvisorOpen() {
  const ctx = useContext(AIAdvisorContext)
  return ctx?.isOpen ?? false
}

// Registers a module's advisor trigger (label/icon) and portals `content`
// into the shared panel body. Call once per View; content is normal JSX from
// that View's own render, so it updates exactly like any other child — no
// state lifting, no re-render loop. `widthPx` is an optional per-instance
// panel-width override (design default is 400px; Ask Brain's design calls
// for 440px — see BrainAdvisorTrigger.tsx).
export function useAIAdvisor(label: string, icon: LucideIcon, content: ReactNode, widthPx?: number) {
  const ctx = useContext(AIAdvisorContext)
  if (!ctx) throw new Error('useAIAdvisor must be used within AIAdvisorProvider')

  useEffect(() => {
    ctx.registerTrigger(label, icon, widthPx)
    return () => ctx.unregisterTrigger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, icon, widthPx])

  return ctx.panelBody ? createPortal(content, ctx.panelBody) : null
}

// Used by Header — returns null on routes with no registered advisor.
export function useAIAdvisorTrigger() {
  const ctx = useContext(AIAdvisorContext)
  if (!ctx?.label || !ctx.icon) return null
  return { label: ctx.label, icon: ctx.icon, isOpen: ctx.isOpen, toggle: ctx.toggle }
}
