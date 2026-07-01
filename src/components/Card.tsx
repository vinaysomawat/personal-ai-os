import { type ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export default function Card({ title, children, className = '', action }: CardProps) {
  return (
    <div className={`bg-surface-1 border border-surface-3 rounded-xl p-5 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
