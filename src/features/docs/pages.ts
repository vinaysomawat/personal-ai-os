import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The public docs site (/docs) renders these repo files as they are, so the
// site and GitHub never disagree. Only the general pages are public; the
// per-module spec (docs/modules/*, database, telegram, cron, ui-reference)
// stays on GitHub, and links to it point there.
export const REPO = 'https://github.com/vinaysomawat/personal-ai-os'

export interface DocPage { slug: string; title: string; file: string; blurb: string }
export const DOC_PAGES: DocPage[] = [
  { slug: '', title: 'Overview', file: 'README.md', blurb: 'What Personal OS is, its modules and its stack.' },
  { slug: 'architecture', title: 'Architecture', file: 'docs/architecture.md', blurb: 'How a request flows, the code layout, shared components and the design system.' },
  { slug: 'ai-gateway', title: 'AI Gateway', file: 'docs/ai-gateway.md', blurb: 'One entry point for every AI call: model routing, caching and the spend ceiling.' },
  { slug: 'self-hosting', title: 'Self-hosting', file: 'docs/self-hosting.md', blurb: 'Run your own copy with Supabase, Vercel, Anthropic and optional Telegram bots.' },
]

export const docPage = (slug: string) => DOC_PAGES.find(p => p.slug === slug) ?? null
export const readDoc = (p: DocPage) => readFileSync(join(process.cwd(), p.file), 'utf-8')

// A link inside a doc, resolved from that doc's folder: another public page
// becomes its /docs route, anything else in the repo opens on GitHub.
export function docHref(from: DocPage, to: string): string {
  if (/^(https?:|mailto:|#)/.test(to)) return to
  const [path, hash] = to.split('#')
  const base = from.file.includes('/') ? from.file.slice(0, from.file.lastIndexOf('/') + 1) : ''
  const parts: string[] = []
  for (const seg of (base + path).split('/')) {
    if (seg === '..') parts.pop()
    else if (seg && seg !== '.') parts.push(seg)
  }
  const file = parts.join('/')
  const page = DOC_PAGES.find(p => p.file === file)
  if (page) return `/docs${page.slug ? `/${page.slug}` : ''}${hash ? `#${hash}` : ''}`
  return `${REPO}/blob/master/${file}${hash ? `#${hash}` : ''}`
}
