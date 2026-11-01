import type { Metadata } from 'next'
import Link from 'next/link'
import { DOC_PAGES, REPO } from '@/features/docs/pages'
import { DocsNav } from '@/features/docs/DocsNav'

export const metadata: Metadata = {
  title: { default: 'Personal OS docs', template: '%s · Personal OS docs' },
  description: 'Architecture of Personal OS and how to self-host it with Supabase, Vercel and Claude.',
}

// Public (middleware lets /docs through without a session); the app's own
// nav and quick-add are hidden here.
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3 pt-1">
        <Link href="/docs" className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] bg-accent text-white font-bold text-[13px] shrink-0">V</span>
          <span className="text-[15px] font-bold text-fg-primary truncate">Personal OS <span className="text-fg-tertiary font-medium">docs</span></span>
        </Link>
        <a href={REPO} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-accent hover:underline shrink-0">GitHub ↗</a>
      </header>
      <div className="grid md:grid-cols-[180px_1fr] gap-4 items-start">
        <DocsNav pages={DOC_PAGES.map(({ slug, title }) => ({ slug, title }))} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
