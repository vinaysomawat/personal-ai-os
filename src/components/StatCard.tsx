import { type ReactNode } from 'react'

interface StatCardProps {
  value: ReactNode
  label: string
  valueClassName?: string
  icon?: ReactNode
  onClick?: () => void
  active?: boolean
}

export default function StatCard({ value, label, valueClassName = 'text-fg-primary', icon, onClick, active }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`bg-surface-1 border rounded-xl p-3 flex flex-col items-center w-full ${onClick ? 'cursor-pointer text-left' : ''} ${active ? 'border-accent' : 'border-surface-3'}`}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-2xl font-bold ${valueClassName}`}>{value}</span>
      </div>
      <span className="text-xs text-fg-tertiary mt-0.5">{label}</span>
    </Tag>
  )
}
