import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface ChangelogSection {
  heading: string
  items: string[]
}

// Deterministic, no AI — CHANGELOG.md is the single source of truth (also
// readable as a plain file on GitHub); this just parses its "## {heading}"
// + "- {item}" structure into sections rather than pulling in a markdown
// library for two syntax patterns (same "hand-roll the tiny bit we need"
// choice as FormattedText.tsx's bold/italic renderer).
function parseChangelog(md: string): ChangelogSection[] {
  const lines = md.split('\n')
  const sections: ChangelogSection[] = []
  let current: ChangelogSection | null = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      current = { heading: line.slice(3).trim(), items: [] }
      sections.push(current)
    } else if (line.startsWith('- ') && current) {
      current.items.push(line.slice(2).trim())
    }
  }
  return sections
}

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf-8')
  const sections = parseChangelog(raw)

  return (
    <div className="space-y-3">
      <h1 className="text-[34px] font-bold tracking-[-0.05em] text-fg-primary">Changelog</h1>
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-[var(--card-pad-lg)] space-y-6">
        {sections.map(section => (
          <div key={section.heading}>
            <h2 className="text-[13px] font-bold text-fg-primary mb-2.5">{section.heading}</h2>
            {section.items.length > 0 ? (
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li key={i} className="text-[13px] text-fg-secondary leading-relaxed flex gap-2">
                    <span className="text-fg-quaternary shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-fg-tertiary">See <code className="text-xs bg-surface-2 rounded px-1.5 py-0.5">git log</code> for full history.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
