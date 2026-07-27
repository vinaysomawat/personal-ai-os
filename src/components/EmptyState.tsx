import { Plus, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  cta?: { label: string; onClick: () => void }
  compact?: boolean
}

export default function EmptyState({ icon: Icon, message, cta, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${compact ? 'py-4' : 'py-6'}`}>
      <Icon size={18} className="text-fg-quaternary" />
      <p className="text-sm text-fg-quaternary">{message}</p>
      {cta && (
        <button onClick={cta.onClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors mt-0.5">
          <Plus size={12} /> {cta.label}
        </button>
      )}
    </div>
  )
}
