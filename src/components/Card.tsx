import { type ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  padding?: string
}

export default function Card({ title, children, className = '', action, padding = 'p-[var(--card-pad-lg)]' }: CardProps) {
  return (
    <div className={`bg-surface-1 border border-surface-3 rounded-[18px] shadow-card ${padding} ${className}`}>
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
