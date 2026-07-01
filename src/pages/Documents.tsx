import Card from '../components/Card'
import { FileText, FolderOpen, Plus, Download, Search } from 'lucide-react'
import { useState } from 'react'

interface Doc {
  name: string
  folder: string
  size: string
  updated: string
  type: 'pdf' | 'md' | 'txt' | 'doc'
}

const docs: Doc[] = [
  { name: 'Resume_2025.pdf', folder: 'Career', size: '148 KB', updated: 'Jun 28', type: 'pdf' },
  { name: 'System Design Notes.md', folder: 'Learning', size: '32 KB', updated: 'Jun 30', type: 'md' },
  { name: 'Monthly Budget June.md', folder: 'Finance', size: '8 KB', updated: 'Jun 30', type: 'md' },
  { name: 'Offer Letter - Wipro.pdf', folder: 'Career', size: '220 KB', updated: 'May 15', type: 'pdf' },
  { name: 'Workout Plan Q3.txt', folder: 'Health', size: '4 KB', updated: 'Jun 20', type: 'txt' },
  { name: 'AWS Study Guide.md', folder: 'Learning', size: '61 KB', updated: 'Jun 22', type: 'md' },
  { name: 'SIP Investment Plan.doc', folder: 'Finance', size: '18 KB', updated: 'Jun 10', type: 'doc' },
  { name: 'Coding Interview Prep.md', folder: 'Career', size: '45 KB', updated: 'Jun 25', type: 'md' },
]

const folders = ['All', 'Career', 'Finance', 'Health', 'Learning']

const typeColor: Record<Doc['type'], string> = {
  pdf: 'text-red-400 bg-red-400/10',
  md: 'text-blue-400 bg-blue-400/10',
  txt: 'text-slate-400 bg-slate-400/10',
  doc: 'text-blue-300 bg-blue-300/10',
}

export default function Documents() {
  const [folder, setFolder] = useState('All')
  const [query, setQuery] = useState('')

  const filtered = docs.filter(
    d =>
      (folder === 'All' || d.folder === folder) &&
      d.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 bg-surface-1 border border-surface-3 rounded-lg px-3 py-2">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
          <Plus size={14} />
          Upload
        </button>
      </div>

      <div className="flex gap-2">
        {folders.map(f => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              folder === f
                ? 'bg-accent/20 text-accent'
                : 'bg-surface-1 border border-surface-3 text-slate-400 hover:bg-surface-2'
            }`}
          >
            <FolderOpen size={13} />
            {f}
          </button>
        ))}
      </div>

      <Card title={`${filtered.length} document${filtered.length !== 1 ? 's' : ''}`}>
        <div className="space-y-1.5">
          {filtered.map(doc => (
            <div
              key={doc.name}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors group cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor[doc.type]}`}>
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{doc.name}</p>
                <p className="text-xs text-slate-600">{doc.folder} · {doc.size} · {doc.updated}</p>
              </div>
              <code className={`text-xs px-1.5 py-0.5 rounded uppercase font-mono ${typeColor[doc.type]}`}>
                {doc.type}
              </code>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-3">
                <Download size={13} className="text-slate-400" />
              </button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-600 text-sm">No documents found</div>
          )}
        </div>
      </Card>
    </div>
  )
}
