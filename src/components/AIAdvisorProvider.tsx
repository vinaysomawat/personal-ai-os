'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { X, type LucideIcon } from 'lucide-react'

interface AIAdvisorContextValue {
  label: string | null
  icon: LucideIcon | null
  isOpen: boolean
  toggle: () => void
  registerTrigger: (label: string, icon: LucideIcon) => void
  unregisterTrigger: () => void
  panelBody: HTMLDivElement | null
}

const AIAdvisorContext = createContext<AIAdvisorContextValue | null>(null)

// Header.tsx can't read a page's local state directly (separate component in
// the layout tree), so each module's View registers a trigger (label/icon)
// here and portals its advisor content directly into the panel body DOM node
// — content never round-trips through Context state, so typing/interacting
// inside the panel only re-renders the View itself, not this Provider.
export function AIAdvisorProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null)
  const [icon, setIcon] = useState<LucideIcon | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [panelBody, setPanelBody] = useState<HTMLDivElement | null>(null)

  useEffect(() => { setPanelBody(bodyRef.current) }, [])
  useEffect(() => { setIsOpen(false) }, [pathname])

  const registerTrigger = (l: string, i: LucideIcon) => { setLabel(l); setIcon(i) }
  const unregisterTrigger = () => { setLabel(null); setIcon(null) }

  const Icon = icon

  return (
    <AIAdvisorContext.Provider value={{ label, icon, isOpen, toggle: () => setIsOpen(v => !v), registerTrigger, unregisterTrigger, panelBody }}>
      {children}
      {/* Always mounted (never conditionally rendered on `label`) so bodyRef
          attaches on Provider's first render — otherwise the ref never
          captures a node and panelBody stays null forever. Visibility is
          purely CSS-driven instead. */}
      <div
        className={`fixed inset-0 z-40 bg-overlay ${isOpen && label ? '' : 'hidden'}`}
        onClick={() => setIsOpen(false)}
      />
      <div className={`fixed top-14 right-4 md:right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto bg-surface-1 border border-surface-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 fade-in duration-150 ${isOpen && label ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3 sticky top-0 bg-surface-1 z-10">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} className="text-accent" />}
            <span className="text-sm font-semibold text-fg-primary">{label}</span>
          </div>
          <button onClick={() => setIsOpen(false)} aria-label="Close AI advisor panel" className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-secondary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div ref={bodyRef} className="p-4" />
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
// state lifting, no re-render loop.
export function useAIAdvisor(label: string, icon: LucideIcon, content: ReactNode) {
  const ctx = useContext(AIAdvisorContext)
  if (!ctx) throw new Error('useAIAdvisor must be used within AIAdvisorProvider')

  useEffect(() => {
    ctx.registerTrigger(label, icon)
    return () => ctx.unregisterTrigger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, icon])

  return ctx.panelBody ? createPortal(content, ctx.panelBody) : null
}

// Used by Header — returns null on routes with no registered advisor.
export function useAIAdvisorTrigger() {
  const ctx = useContext(AIAdvisorContext)
  if (!ctx?.label || !ctx.icon) return null
  return { label: ctx.label, icon: ctx.icon, isOpen: ctx.isOpen, toggle: ctx.toggle }
}
