import { ExternalLink } from 'lucide-react'
import { linksFor } from '../topic-links'

// The "Learn" bar under a Question Bank question: its topics, each with links
// that open in a new tab. Renders nothing for a question with no learning links.
export function TopicLinks({ question }: { question: { topics: string[]; category: string } }) {
  const rows = linksFor(question)
  if (!rows.length) return null
  return (
    <div className="mt-2 rounded-[8px] border border-border bg-surface-2 px-2.5 py-1.5 space-y-1">
      {rows.map(row => (
        <div key={row.topic} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[11.5px]">
          <span className="font-semibold text-fg-primary">{row.topic}</span>
          {row.links.map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
              {l.label} <ExternalLink size={10} />
            </a>
          ))}
        </div>
      ))}
    </div>
  )
}
