import { type ReactNode } from 'react'

interface StatCardProps {
  value: ReactNode
  label: string
  // Optional one-line secondary detail under the value (a total, a date, a
  // rate) — CLAUDE.md's "smarter cards over bare title+value".
  sub?: ReactNode
  valueClassName?: string
  icon?: ReactNode
  onClick?: () => void
  active?: boolean
}

// The one stat tile for every page: uppercase grey 10.5px label on top,
// 19px bold value, optional sub-line, left-aligned.
export default function StatCard({ value, label, sub, valueClassName = 'text-fg-primary', icon, onClick, active }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={`bg-surface-1 border rounded-[10px] shadow-card p-[var(--card-pad-sm)] flex flex-col items-start text-left w-full min-w-0 transition-colors ${onClick ? 'cursor-pointer hover:border-border-strong' : ''} ${active ? 'border-accent' : 'border-surface-3'}`}
    >
      <span className="text-[10.5px] font-semibold text-fg-tertiary uppercase tracking-[0.4px] truncate max-w-full">{label}</span>
      <span className={`flex items-center gap-1 text-[19px] font-bold mt-0.5 tabular-nums tracking-[-0.01em] ${valueClassName}`}>
        {icon}
        {value}
      </span>
      {sub && <span className="text-[10.5px] text-fg-tertiary mt-0.5 truncate max-w-full">{sub}</span>}
    </Tag>
  )
}
