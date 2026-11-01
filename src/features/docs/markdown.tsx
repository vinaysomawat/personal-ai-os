import type { ReactNode } from 'react'

// A small markdown renderer for the public docs site — the subset the docs
// files actually use (headings, paragraphs, lists, tables, fenced code,
// inline code / bold / italic / links / images), rendered to React nodes at
// build time. Like /changelog, no markdown library for a known, fixed input.

export interface Heading { level: number; text: string; id: string }

export const slugify = (s: string) =>
  s.toLowerCase().replace(/`/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

// Inline: `code`, [![alt](img)](href) (badges, the deploy button),
// ![alt](src), [text](href), **bold**, *italic*.
const INLINE = /(`[^`]+`)|(\[!\[[^\]]*\]\([^)]+\)\]\([^)]+\))|(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)/g

function link(to: string, key: string, children: ReactNode) {
  const external = /^https?:/.test(to)
  return <a key={key} href={to} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className="text-accent hover:underline">{children}</a>
}
// eslint-disable-next-line @next/next/no-img-element -- remote badges, not page images
const img = (src: string, alt: string, cls: string) => <img src={src} alt={alt} className={`inline-block align-middle ${cls}`} />

function inline(text: string, href: (h: string) => string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${key}-${n++}`
    if (m[1]) out.push(<code key={k} className="text-[12px] bg-surface-2 border border-surface-3 rounded px-1 py-px font-mono">{t.slice(1, -1)}</code>)
    else if (m[2]) {
      const [, alt, src, to] = t.match(/^\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)$/)!
      out.push(link(href(to), k, img(src, alt, 'h-7')))
    } else if (m[3]) {
      const [, alt, src] = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)!
      out.push(<span key={k}>{img(src, alt, 'h-5')}</span>)
    } else if (m[4]) {
      const [, label, to] = t.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!
      out.push(link(href(to), k, inline(label, href, k)))
    } else if (m[5]) out.push(<strong key={k} className="font-semibold text-fg-primary">{inline(t.slice(2, -2), href, k)}</strong>)
    else out.push(<em key={k}>{inline(t.slice(1, -1), href, k)}</em>)
    last = m.index! + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

export function renderMarkdown(md: string, href: (h: string) => string): { nodes: ReactNode[]; headings: Heading[] } {
  const lines = md.replace(/\r/g, '').split('\n')
  const nodes: ReactNode[] = []
  const headings: Heading[] = []
  let i = 0
  const k = () => `b${nodes.length}`
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim() === '---') { i++; continue }
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i])
      i++
      nodes.push(<pre key={k()} className="bg-surface-2 border border-surface-3 rounded-[8px] p-3 overflow-x-auto text-[12px] leading-relaxed font-mono text-fg-primary"><code>{code.join('\n')}</code></pre>)
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const id = slugify(h[2])
      headings.push({ level, text: h[2].replace(/`/g, ''), id })
      const cls = level === 1 ? 'text-[22px] font-bold mt-1 mb-2' : level === 2 ? 'text-[16px] font-bold mt-6 mb-2 pt-3 border-t border-surface-3' : 'text-[13.5px] font-semibold mt-4 mb-1.5'
      const Tag = (['h1', 'h2', 'h3', 'h4'] as const)[level - 1]
      nodes.push(<Tag key={k()} id={id} className={`${cls} text-fg-primary scroll-mt-16`}>{inline(h[2], href)}</Tag>)
      i++
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[] = []
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i])
      const [head, , ...body] = rows
      nodes.push(
        <div key={k()} className="overflow-x-auto my-3 border border-surface-3 rounded-[8px]">
          <table className="w-full text-[12.5px] border-collapse">
            <thead className="bg-surface-2"><tr>{cells(head).map((c, j) => <th key={j} className="text-left font-semibold text-fg-primary px-2.5 py-1.5 border-b border-surface-3">{inline(c, href)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri} className="border-b border-surface-3 last:border-0">{cells(r).map((c, j) => <td key={j} className="align-top text-fg-secondary px-2.5 py-1.5">{inline(c, href)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    const list = line.match(/^(\d+\.|[-*])\s+/)
    if (list) {
      const ordered = /\d/.test(list[1])
      const items: string[] = []
      for (; i < lines.length && /^(\d+\.|[-*])\s+/.test(lines[i]); i++) items.push(lines[i].replace(/^(\d+\.|[-*])\s+/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      nodes.push(<Tag key={k()} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 my-2 space-y-1 text-[13px] text-fg-secondary leading-relaxed`}>{items.map((it, j) => <li key={j}>{inline(it, href)}</li>)}</Tag>)
      continue
    }
    const para: string[] = []
    for (; i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||(\d+\.|[-*])\s)/.test(lines[i]); i++) para.push(lines[i])
    nodes.push(<p key={k()} className="text-[13px] text-fg-secondary leading-relaxed my-2">{inline(para.join(' '), href)}</p>)
  }
  return { nodes, headings }
}
