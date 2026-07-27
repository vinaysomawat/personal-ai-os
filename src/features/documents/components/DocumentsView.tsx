'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { Plus, Trash2, X, Search, FileText, Sparkles, Send } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { addDocument, updateDocument, deleteDocument } from '../actions'
import { askDocument, summariseDocument } from '@/features/ai/doc-qa'
import type { Document } from '../types'

interface Props { initialDocuments: Document[] }

export default function DocumentsView({ initialDocuments }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Document | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [isPending, startTransition] = useTransition()
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiAction, setAiAction] = useState<'ask' | 'summarise' | null>(null)

  const [docs, updateDocs] = useOptimistic(
    initialDocuments,
    (state: Document[], action: { type: string; payload: Partial<Document> & { id?: string } }) => {
      if (action.type === 'add') return [action.payload as Document, ...state]
      if (action.type === 'update') return state.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d)
      if (action.type === 'delete') return state.filter(d => d.id !== action.payload.id)
      return state
    }
  )

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = () => {
    if (!editTitle.trim()) return
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const optimistic: Document = {
      id: `temp-${Date.now()}`, user_id: '',
      title: editTitle, content: editContent, tags,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    setShowForm(false)
    setEditTitle(''); setEditContent(''); setEditTags('')
    startTransition(async () => {
      updateDocs({ type: 'add', payload: optimistic })
      await addDocument(optimistic.title, optimistic.content, tags)
    })
  }

  const handleSave = () => {
    if (!selected || !editTitle.trim()) return
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const updated = { ...selected, title: editTitle, content: editContent, tags, updated_at: new Date().toISOString() }
    setSelected(updated)
    startTransition(async () => {
      updateDocs({ type: 'update', payload: updated })
      await updateDocument(selected.id, editTitle, editContent, tags)
    })
  }

  const handleDelete = (id: string) => {
    if (selected?.id === id) setSelected(null)
    startTransition(async () => {
      updateDocs({ type: 'delete', payload: { id } })
      await deleteDocument(id)
    })
  }

  const openDoc = (doc: Document) => {
    setSelected(doc)
    setEditTitle(doc.title)
    setEditContent(doc.content)
    setEditTags(doc.tags.join(', '))
    setAiAnswer(null)
    setShowForm(false)
  }

  const handleAsk = async () => {
    if (!editContent || !aiQuestion.trim()) return
    setAiAction('ask')
    setAiAnswer(null)
    try {
      const answer = await askDocument(editTitle, editContent, aiQuestion)
      setAiAnswer(answer)
    } finally {
      setAiAction(null)
    }
  }

  const handleSummarise = async () => {
    if (!editContent) return
    setAiAction('summarise')
    setAiAnswer(null)
    setAiQuestion('Summarise this document')
    try {
      const summary = await summariseDocument(editTitle, editContent)
      setAiAnswer(summary)
    } finally {
      setAiAction(null)
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7.5rem)] md:h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <div className={`${(selected || showForm) ? 'hidden md:flex' : 'flex'} w-full md:w-64 shrink-0 flex-col gap-3`}>
        <div className="flex items-center gap-2 bg-surface-1 border border-surface-3 rounded-lg px-3 py-2">
          <Search size={13} className="text-fg-tertiary shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent text-sm text-fg-secondary placeholder-fg-quaternary outline-none" />
        </div>
        <button onClick={() => { setShowForm(true); setSelected(null); setEditTitle(''); setEditContent(''); setEditTags(''); setAiAnswer(null) }}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
          <Plus size={13} /> New document
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.length === 0 && <EmptyState icon={FileText} message="No documents" compact />}
          {filtered.map(doc => (
            <div key={doc.id} role="button" tabIndex={0} onClick={() => openDoc(doc)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(doc) } }}
              className={`w-full text-left p-3 rounded-lg border transition-colors group cursor-pointer ${selected?.id === doc.id ? 'bg-accent/10 border-accent/30' : 'bg-surface-1 border-surface-3 hover:bg-surface-2'}`}>
              <div className="flex items-start gap-2">
                <FileText size={13} className="shrink-0 mt-0.5 text-fg-tertiary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-fg-secondary truncate font-medium">{doc.title}</p>
                    <span className="text-xs text-fg-quaternary shrink-0">{doc.updated_at.slice(0, 10)}</span>
                  </div>
                  <p className="text-xs text-fg-quaternary mt-0.5 truncate">{doc.content.slice(0, 50) || 'Empty'}</p>
                  {doc.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {doc.tags.slice(0, 2).map(t => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-fg-tertiary">{t}</span>)}
                    </div>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(doc.id) }} aria-label="Delete document"
                  className="opacity-0 group-hover:opacity-100 text-fg-quaternary hover:text-red-400 transition-all shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className={`${(selected || showForm) ? 'flex' : 'hidden md:flex'} flex-1 bg-surface-1 border border-surface-3 rounded-xl flex-col overflow-hidden`}>
        {(selected || showForm) ? (
          <>
            <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-surface-3">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (showForm ? handleAdd() : handleSave())}
                placeholder="Document title..."
                autoFocus={showForm}
                className="flex-1 min-w-[120px] bg-transparent text-base font-semibold text-fg-primary placeholder-fg-quaternary outline-none"
              />
              <input
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="tags, comma, separated"
                className="bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-fg-secondary placeholder-fg-quaternary outline-none focus:border-accent transition-colors w-28 sm:w-40"
              />
              <button
                onClick={showForm ? handleAdd : handleSave}
                disabled={isPending || !editTitle.trim()}
                className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                {showForm ? 'Create' : 'Save'}
              </button>
              <button onClick={() => { setSelected(null); setShowForm(false) }} aria-label="Close document" className="p-1.5 -m-1.5 text-fg-tertiary hover:text-fg-secondary">
                <X size={15} />
              </button>
            </div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Start writing..."
              className="flex-1 bg-transparent px-5 py-4 text-sm text-fg-secondary placeholder-fg-quaternary outline-none resize-none leading-relaxed font-mono"
            />

            {/* AI Q&A panel */}
            {selected && (
              <div className="border-t border-surface-3 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-accent" />
                  <span className="text-xs font-medium text-accent uppercase tracking-widest">Ask AI</span>
                  {editContent && (
                    <button onClick={handleSummarise} disabled={aiAction !== null} className="ml-auto text-xs text-fg-tertiary hover:text-fg-secondary transition-colors">
                      {aiAction === 'summarise' ? 'Summarising…' : 'Summarise'}
                    </button>
                  )}
                </div>
                {aiAnswer && (
                  <div className="text-xs text-fg-secondary bg-accent/5 border border-accent/15 rounded-lg p-3 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {aiAnswer}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAsk()}
                    placeholder="Ask a question about this document..."
                    disabled={aiAction !== null}
                    className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-fg-secondary placeholder-fg-quaternary outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={aiAction !== null || !aiQuestion.trim() || !editContent}
                    aria-label="Ask"
                    className="px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/80 disabled:opacity-40 transition-colors"
                  >
                    {aiAction === 'ask' ? <span className="text-xs">...</span> : <Send size={12} />}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-fg-quaternary">
            <FileText size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Select a document or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
