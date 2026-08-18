import { Fragment } from 'react'

// Lightweight **bold**/*italic* renderer for AI-generated text — system
// prompts ask the model not to use markdown, but it does anyway often enough
// that showing raw asterisks reads as broken. Only handles the two inline
// patterns actually seen in practice; not a full markdown parser and
// deliberately doesn't pull in a markdown library for that.
export default function FormattedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-fg-primary">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}
