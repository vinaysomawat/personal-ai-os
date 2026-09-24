import type { ReactNode } from 'react'

// One page header for every module (UI v2.2a, 2026-09-24) — replaces nine
// hand-rolled title/chip rows that had drifted apart. Matches the Claude
// Design source: 34px/700 title with -0.02em tracking (pages had drifted to
// -0.05em), 11px/600 pill chips on surface-2, optional right-side action.
export default function PageHeader({ title, chips, action, subtitle }: {
  title: string
  chips?: ReactNode
  action?: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[34px] font-bold tracking-[-0.02em] leading-tight text-fg-primary">{title}</h1>
          {chips}
        </div>
        {subtitle && <p className="text-xs text-fg-tertiary mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

type ChipTone = 'default' | 'accent' | 'good' | 'warn' | 'risk' | 'accentSoft'

const TONE: Record<ChipTone, string> = {
  default: 'bg-surface-2 text-fg-secondary',
  accent: 'bg-surface-2 text-accent',
  good: 'bg-surface-2 text-good',
  warn: 'bg-surface-2 text-warn',
  risk: 'bg-risk-soft text-risk',
  accentSoft: 'bg-accent-soft text-accent-strong',
}

export function HeaderChip({ tone = 'default', className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${className ?? TONE[tone]}`}>{children}</span>
  )
}
