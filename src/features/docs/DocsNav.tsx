'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Sidebar on desktop, a scrollable pill row on phones.
export function DocsNav({ pages }: { pages: { slug: string; title: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Docs" className="md:sticky md:top-14 flex md:flex-col gap-1 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {pages.map(p => {
        const href = `/docs${p.slug ? `/${p.slug}` : ''}`
        const active = pathname === href
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-full md:rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap ${active ? 'bg-accent text-white' : 'text-fg-secondary hover:bg-surface-2'}`}>
            {p.title}
          </Link>
        )
      })}
    </nav>
  )
}
