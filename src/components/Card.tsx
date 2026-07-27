import { type ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
  padding?: string
}

export default function Card({ title, children, className = '', action, padding = 'p-3.5' }: CardProps) {
  return (
    <div className={`bg-surface-1 border border-surface-3 rounded-xl shadow-card ${padding} ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-fg-secondary uppercase tracking-wider">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
