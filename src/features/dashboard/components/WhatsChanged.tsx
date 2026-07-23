import Link from 'next/link'
import Card from '@/components/Card'
import type { ChangeItem } from '../whats-changed'

export default function WhatsChanged({ items }: { items: ChangeItem[] }) {
  // No full Card chrome (title header + standard padding) when there's
  // nothing to show — a single throwaway sentence doesn't earn a whole
  // card slot; collapse to one slim inline bar instead.
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-1 border border-surface-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What&apos;s Changed</span>
        <span className="text-slate-700">·</span>
        <span className="text-xs text-slate-500">Nothing new since yesterday yet</span>
      </div>
    )
  }

  return (
    <Card title="What's Changed" padding="p-3.5">
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>
            <Link href={item.href} className="flex items-center gap-3 py-1 px-2 -mx-2 rounded-lg hover:bg-surface-2 transition-colors">
              <span className="text-base shrink-0">{item.emoji}</span>
              <p className="text-sm text-slate-300 flex-1">{item.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
