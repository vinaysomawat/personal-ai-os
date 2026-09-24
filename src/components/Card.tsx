import { type ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  padding?: string
}

// No h-full (removed 2026-09-24, UI v2.2a): grid rows already stretch
// their items to equal height by default (align-self: stretch), so h-full
// only ever mattered in \`items-start\` rows — where it wrongly stretched a
// short card to its taller sibling's height anyway (patched per-card with
// !h-auto six times before this fix). flex-col stays so a card's footer
// action can sit at the bottom via mt-auto when a row does stretch it.
export default function Card({ title, children, className = '', action, padding = 'p-[var(--card-pad-lg)]' }: CardProps) {
  return (
    <div className={`bg-surface-1 border border-surface-3 rounded-[18px] shadow-card flex flex-col ${padding} ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[13px] font-bold text-fg-primary">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
