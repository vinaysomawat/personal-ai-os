import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArchitectureDiagram } from '@/features/docs/ArchitectureDiagram'
import { renderMarkdown } from '@/features/docs/markdown'
import { DOC_PAGES, REPO, docHref, docPage, readDoc } from '@/features/docs/pages'

// Built once at deploy from the repo's markdown files; nothing is fetched at request time.
export const dynamicParams = false
export const generateStaticParams = () => DOC_PAGES.map(p => ({ slug: p.slug ? [p.slug] : [] }))

type Props = { params: Promise<{ slug?: string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = docPage((await params).slug?.join('/') ?? '')
  return page ? { title: page.slug ? page.title : { absolute: 'Personal OS docs' }, description: page.blurb } : {}
}

export default async function DocPage({ params }: Props) {
  const page = docPage((await params).slug?.join('/') ?? '')
  if (!page) notFound()
  const { nodes, headings } = renderMarkdown(readDoc(page), to => docHref(page, to))
  const toc = headings.filter(h => h.level === 2)
  return (
    <div className="grid lg:grid-cols-[1fr_190px] gap-4 items-start">
      <article className="bg-surface-1 border border-surface-3 rounded-[10px] px-4 py-3 md:px-5 min-w-0">
        {/* The diagram sits under the architecture page's title. */}
        {page.slug === 'architecture' ? <>{nodes.slice(0, 1)}<ArchitectureDiagram />{nodes.slice(1)}</> : nodes}
        <p className="text-[11.5px] text-fg-tertiary mt-6 pt-3 border-t border-surface-3">
          Rendered from <a className="text-accent hover:underline" href={`${REPO}/blob/master/${page.file}`} target="_blank" rel="noreferrer">{page.file}</a> — edit it on GitHub.
        </p>
      </article>
      {toc.length > 1 && (
        <nav aria-label="On this page" className="hidden lg:block sticky top-14">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5">On this page</div>
          <ul className="space-y-1">
            {toc.map(h => <li key={h.id}><a href={`#${h.id}`} className="text-[12px] text-fg-secondary hover:text-accent">{h.text}</a></li>)}
          </ul>
        </nav>
      )}
    </div>
  )
}
