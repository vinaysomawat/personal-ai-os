import Link from 'next/link'
import Card from '@/components/Card'
import type { ChangeItem } from '../whats-changed'

const TONE_COLOR: Record<ChangeItem['tone'], string> = {
  good: 'text-green-400',
  risk: 'text-red-400',
  neutral: 'text-fg-tertiary',
}

export default function WhatsChanged({ items }: { items: ChangeItem[] }) {
  // No full Card chrome (title header + standard padding) when there's
  // nothing to show — a single throwaway sentence doesn't earn a whole
  // card slot; collapse to one slim inline bar instead.
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-1 border border-surface-3">
        <span className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider">What&apos;s Changed</span>
        <span className="text-fg-quaternary">·</span>
        <span className="text-xs text-fg-tertiary">Nothing new since yesterday yet</span>
      </div>
    )
  }

  return (
    <Card title="What's Changed">
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>
            <Link href={item.href} className="flex items-center gap-2 justify-between py-1 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors">
              <span className="flex items-center gap-2 text-sm text-fg-secondary min-w-0">
                <span className="text-base shrink-0">{item.emoji}</span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className={`text-sm font-medium shrink-0 ${TONE_COLOR[item.tone]}`}>{item.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
